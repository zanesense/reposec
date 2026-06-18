import type { Finding } from "./types.ts";
import type { SecretCandidate } from "./scanner.ts";

const VERIFY_TIMEOUT_MS = 6_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyCandidate(candidate: SecretCandidate): Promise<boolean | null> {
  const name = candidate.patternName.toLowerCase();
  const value = candidate.value.trim();

  try {
    if (name.includes("github token")) {
      const res = await fetchWithTimeout("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${value}`,
          "User-Agent": "RepoSec-Secret-Verifier",
        },
      });
      return res.status === 200;
    }

    if (name.includes("stripe")) {
      const res = await fetchWithTimeout("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${value}` },
      });
      return res.status === 200;
    }

    if (name.includes("huggingface")) {
      const res = await fetchWithTimeout("https://huggingface.co/api/whoami-v2", {
        headers: { Authorization: `Bearer ${value}` },
      });
      return res.status === 200;
    }
  } catch {
    return null;
  }

  return null;
}

export async function verifyFindings(
  findings: Finding[],
  candidates: SecretCandidate[] | undefined,
): Promise<void> {
  if (!candidates || candidates.length === 0) return;
  const byId = new Map(findings.map((finding) => [finding.id, finding]));

  for (const candidate of candidates.slice(0, 25)) {
    const finding = byId.get(candidate.findingId);
    if (!finding) continue;
    const verified = await verifyCandidate(candidate);
    if (verified !== true) continue;
    finding.verified = true;
    finding.confidence = "verified";
    finding.description = `${finding.description} The token was verified live by RepoSec's opt-in verifier.`;
  }
}
