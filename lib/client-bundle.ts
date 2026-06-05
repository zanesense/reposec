import { promises as dns } from "node:dns";
import net from "node:net";
import type { RepoFile } from "./types";

const MAX_HTML_BYTES = 750_000;
const MAX_ASSET_BYTES = 1_500_000;
const MAX_SCRIPT_ASSETS = 30;
const MAX_SOURCE_MAPS = 10;
const FETCH_TIMEOUT_MS = 8_000;

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) return true;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:")
  );
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  );
}

async function assertPublicHttpsUrl(raw: string): Promise<URL | null> {
  if (!raw.trim()) return null;
  const trimmed = raw.trim();
  const normalized = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }
  const allowInsecureTestScan =
    process.env.REPOSEC_TEST_ALLOW_INSECURE_BUNDLE_SCAN === "1";
  if (url.protocol !== "https:" && !(allowInsecureTestScan && url.protocol === "http:")) {
    return null;
  }
  if (url.username || url.password) return null;
  if (!allowInsecureTestScan && isBlockedHostname(url.hostname)) return null;

  const ipVersion = net.isIP(url.hostname);
  if (!allowInsecureTestScan && ipVersion === 4 && isPrivateIpv4(url.hostname)) return null;
  if (!allowInsecureTestScan && ipVersion === 6 && isPrivateIpv6(url.hostname)) return null;

  if (!allowInsecureTestScan && ipVersion === 0) {
    try {
      const addresses = await dns.lookup(url.hostname, { all: true });
      if (addresses.length === 0) return null;
      for (const addr of addresses) {
        if (addr.family === 4 && isPrivateIpv4(addr.address)) return null;
        if (addr.family === 6 && isPrivateIpv6(addr.address)) return null;
      }
    } catch {
      return null;
    }
  }
  return url;
}

function fetchWithTimeout(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "RepoSec-Client-Bundle-Scanner" },
    redirect: "follow",
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
}

async function fetchText(url: URL, maxBytes: number): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength > maxBytes) return null;
    const text = await res.text();
    if (text.length > maxBytes) return text.slice(0, maxBytes);
    return text;
  } catch {
    return null;
  }
}

function uniqueUrls(urls: URL[]): URL[] {
  const seen = new Set<string>();
  const out: URL[] = [];
  for (const url of urls) {
    const key = url.href;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function discoverScriptUrls(html: string, pageUrl: URL): URL[] {
  const urls: URL[] = [];
  const attrPattern =
    /<(?:script|link)\b[^>]+(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(html)) !== null) {
    const raw = match[1];
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) continue;
    let url: URL;
    try {
      url = new URL(raw, pageUrl);
    } catch {
      continue;
    }
    const lower = url.pathname.toLowerCase();
    const tag = match[0].toLowerCase();
    const isScript =
      tag.startsWith("<script") ||
      tag.includes('rel="modulepreload"') ||
      tag.includes("rel='modulepreload'") ||
      tag.includes('rel="preload"') ||
      tag.includes("rel='preload'");
    if (!isScript) continue;
    if (!lower.endsWith(".js") && !lower.endsWith(".mjs")) continue;
    urls.push(url);
  }
  return uniqueUrls(urls).slice(0, MAX_SCRIPT_ASSETS);
}

function discoverSourceMapUrl(js: string, assetUrl: URL): URL | null {
  const match = js.match(/\/\/# sourceMappingURL=([^\s]+)/);
  if (!match?.[1]) return null;
  if (match[1].startsWith("data:")) return null;
  try {
    return new URL(match[1], assetUrl);
  } catch {
    return null;
  }
}

function syntheticPath(url: URL): string {
  const pieces = url.pathname.split("/").filter(Boolean);
  const last = pieces.at(-1) || "asset.js";
  const dir = pieces.slice(-4, -1).join("/");
  const path = dir ? `${dir}/${last}` : last;
  return `client-bundle/${url.hostname}/${path}`;
}

export async function fetchClientBundleFiles(
  rawSiteUrl: string | null | undefined,
): Promise<RepoFile[]> {
  if (!rawSiteUrl) return [];
  const pageUrl = await assertPublicHttpsUrl(rawSiteUrl);
  if (!pageUrl) return [];

  const html = await fetchText(pageUrl, MAX_HTML_BYTES);
  if (!html) return [];

  const scripts = discoverScriptUrls(html, pageUrl);
  const files: RepoFile[] = [];
  const sourceMapUrls: URL[] = [];

  for (const scriptUrl of scripts) {
    const safeUrl = await assertPublicHttpsUrl(scriptUrl.href);
    if (!safeUrl) continue;
    const content = await fetchText(safeUrl, MAX_ASSET_BYTES);
    if (!content) continue;
    files.push({ path: syntheticPath(safeUrl), content });
    const mapUrl = discoverSourceMapUrl(content, safeUrl);
    if (mapUrl) sourceMapUrls.push(mapUrl);
  }

  for (const mapUrl of uniqueUrls(sourceMapUrls).slice(0, MAX_SOURCE_MAPS)) {
    const safeUrl = await assertPublicHttpsUrl(mapUrl.href);
    if (!safeUrl) continue;
    const content = await fetchText(safeUrl, MAX_ASSET_BYTES);
    if (!content) continue;
    files.push({ path: syntheticPath(safeUrl), content });
  }

  return files;
}
