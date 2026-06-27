import type {
  ParsedRepoUrl,
  RepoData,
  RepoFile,
  RepoMetadata,
} from "./types.ts";
import { isLikelySecretScanPath, secretScanPriority } from "./scan-targets.ts";

const GITHUB_API = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";

const IMPORTANT_PATHS = [
  "README.md",
  "package.json",
  ".gitignore",
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.example",
  ".reposecignore",
  "reposec-baseline.json",
  ".reposec-baseline.json",
  "SECURITY.md",
  "LICENSE",
  "Dockerfile",
  ".dockerignore",
  "docker-compose.yml",
  "docker-compose.yaml",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "Gemfile",
  "composer.json",
  ".github/CODEOWNERS",
  "CODEOWNERS",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "PULL_REQUEST_TEMPLATE.md",
];

const WORKFLOW_DIR = ".github/workflows";
const DEPENDABOT_PATHS = [
  ".github/dependabot.yml",
  ".github/dependabot.yaml",
];
const ISSUE_TEMPLATE_DIR = ".github/ISSUE_TEMPLATE";
const LOCKFILES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
];

const GITHUB_FETCH_TIMEOUT = 15_000;
const RAW_FETCH_TIMEOUT = 10_000;

function fetchWithTimeout(url: string | URL, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

export class GitHubError extends Error {
  status: number;
  code: "not_found" | "private" | "rate_limited" | "invalid" | "unknown";
  constructor(
    message: string,
    status: number,
    code: GitHubError["code"],
  ) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.code = code;
  }
}

export function parseRepoUrl(input: string): ParsedRepoUrl | null {
  if (!input) return null;
  const trimmed = input.trim();
  const cleaned = trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/$/, "");

  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const [owner, repo] = parts;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
  if (owner.length > 39 || repo.length > 100) return null;

  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
  };
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RepoSec-Scanner",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function githubFetch<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${GITHUB_API}${path}`, GITHUB_FETCH_TIMEOUT, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new GitHubError(
        "Repository not found. Check the URL or make sure the repo is public.",
        404,
        "not_found",
      );
    }
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        const reset = res.headers.get("x-ratelimit-reset");
        throw new GitHubError(
          `GitHub rate limit reached. Try again later${
            reset ? ` (resets at ${new Date(Number(reset) * 1000).toUTCString()})` : ""
          }.`,
          res.status,
          "rate_limited",
        );
      }
      throw new GitHubError(
        "Access denied. The repository may be private.",
        res.status,
        "private",
      );
    }
    throw new GitHubError(
      `GitHub request failed with status ${res.status}.`,
      res.status,
      "unknown",
    );
  }
  return (await res.json()) as T;
}

async function fetchRawFile(
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<string | null> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${RAW_BASE}/${owner}/${repo}/${ref}/${encodedPath}`;
  try {
    const res = await fetchWithTimeout(url, RAW_FETCH_TIMEOUT, {
      headers: { "User-Agent": "RepoSec-Scanner" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    if (res.headers.get("content-type")?.includes("application/octet-stream")) {
      return null;
    }
    const text = await res.text();
    if (text.length > 2_000_000) return text.slice(0, 2_000_000);
    return text;
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

interface GithubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  private: boolean;
  html_url: string;
  homepage?: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count?: number;
  topics?: string[];
  archived?: boolean;
  is_template?: boolean;
  language?: string | null;
  size?: number;
  pushed_at?: string;
  updated_at?: string;
  created_at?: string;
  license?: { spdx_id: string | null; name: string } | null;
}

interface TreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url: string;
}

interface TreeResponse {
  sha: string;
  url: string;
  tree: TreeEntry[];
  truncated: boolean;
}

export async function fetchRepoData(
  owner: string,
  repo: string,
  onProgress?: (stage: number) => void,
): Promise<RepoData> {
  const meta = await githubFetch<GithubRepoResponse>(`/repos/${owner}/${repo}`);
  onProgress?.(0);

  if (meta.private) {
    throw new GitHubError(
      "This repository is private. RepoSec only scans public repositories.",
      403,
      "private",
    );
  }

  const ref = meta.default_branch || "main";

  const tree = await githubFetch<TreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`,
  );
  onProgress?.(1);

  const blobEntries = tree.tree.filter((entry) => entry.type === "blob");
  const fileTree = blobEntries.map((entry) => entry.path);

  const candidates = new Set<string>(IMPORTANT_PATHS);
  for (const entry of blobEntries) {
    const path = entry.path;
    if (path.startsWith(`${WORKFLOW_DIR}/`)) candidates.add(path);
    if (path.startsWith(`${ISSUE_TEMPLATE_DIR}/`)) candidates.add(path);
    for (const dep of DEPENDABOT_PATHS) {
      if (path === dep) candidates.add(path);
    }
    if (isLikelySecretScanPath(path, entry.size)) candidates.add(path);
  }

  const candidatePaths = Array.from(candidates).sort((a, b) => {
    const priorityDelta = secretScanPriority(b) - secretScanPriority(a);
    return priorityDelta || a.localeCompare(b);
  });

  const fetched = await mapWithConcurrency(
    candidatePaths,
    16,
    async (path) => {
      const content = await fetchRawFile(owner, repo, ref, path);
      return { path, content };
    },
  );
  onProgress?.(2);

  const files: RepoFile[] = fetched
    .filter(
      (f): f is { path: string; content: string } =>
        f.content !== null && f.content.length > 0,
    )
    .map((f) => ({ path: f.path, content: f.content }));

  const workflows = fileTree.filter((p) => p.startsWith(`${WORKFLOW_DIR}/`));
  const hasDependabot = DEPENDABOT_PATHS.some((p) => fileTree.includes(p));
  const hasWorkflows = workflows.length > 0;
  const hasIssueTemplate = fileTree.some((p) =>
    p.startsWith(`${ISSUE_TEMPLATE_DIR}/`),
  );
  const hasCodeowners =
    fileTree.includes(".github/CODEOWNERS") ||
    fileTree.includes("CODEOWNERS") ||
    fileTree.includes("docs/CODEOWNERS");
  const hasPullRequestTemplate =
    fileTree.includes(".github/PULL_REQUEST_TEMPLATE.md") ||
    fileTree.includes("PULL_REQUEST_TEMPLATE.md") ||
    fileTree.includes(".github/PULL_REQUEST_TEMPLATE/") ||
    fileTree.includes("docs/PULL_REQUEST_TEMPLATE.md");
  const hasDockerfile = fileTree.some(
    (p) => p === "Dockerfile" || /^Dockerfile\.[^/]+$/.test(p),
  );
  const hasDockerignore = fileTree.includes(".dockerignore");
  const hasChangelog = fileTree.some(
    (p) =>
      p === "CHANGELOG.md" ||
      p === "CHANGELOG" ||
      p === "HISTORY.md" ||
      p === "RELEASES.md" ||
      /^CHANGELOG\.[^/]+$/.test(p),
  );
  const hasContributing = fileTree.includes("CONTRIBUTING.md");
  const hasCodeOfConduct =
    fileTree.includes("CODE_OF_CONDUCT.md") ||
    fileTree.includes(".github/CODE_OF_CONDUCT.md");

  const presentLockfiles = LOCKFILES.filter((p) => fileTree.includes(p));
  const primaryLockfile = presentLockfiles[0] ?? null;
  const extraLockfiles = presentLockfiles.slice(1);

  const metadata: RepoMetadata = {
    owner,
    repo,
    defaultBranch: ref,
    description: meta.description,
    stars: meta.stargazers_count,
    forks: meta.forks_count,
    openIssues: meta.open_issues_count,
    isPrivate: meta.private,
    htmlUrl: meta.html_url,
    homepageUrl: meta.homepage?.trim() || null,
    topics: meta.topics ?? [],
    archived: meta.archived ?? false,
    isTemplate: meta.is_template ?? false,
    language: meta.language ?? null,
    sizeKb: meta.size,
    pushedAt: meta.pushed_at,
    updatedAt: meta.updated_at,
    createdAt: meta.created_at,
    licenseSpdxId: meta.license?.spdx_id ?? null,
    licenseName: meta.license?.name ?? null,
  };

  return {
    metadata,
    files,
    fileTree,
    workflows,
    hasDependabot,
    hasWorkflows,
    hasIssueTemplate,
    hasCodeowners,
    hasPullRequestTemplate,
    hasDockerfile,
    hasDockerignore,
    hasChangelog,
    hasContributing,
    hasCodeOfConduct,
    primaryLockfile,
    extraLockfiles,
  };
}
