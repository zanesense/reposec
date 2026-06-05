import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { RepoData, RepoFile } from "./types";
import { isLikelySecretScanPath } from "./scan-targets";

const LOCAL_SKIP_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  ".venv",
  "venv",
]);

interface LocalLoadOptions {
  includeHistory?: boolean;
  maxHistoryCommits?: number;
  maxHistoryFilesPerCommit?: number;
}

async function walk(root: string, dir: string, files: RepoFile[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (LOCAL_SKIP_DIRS.has(entry.name)) continue;
      await walk(root, fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    let stat;
    try {
      stat = await fs.stat(fullPath);
    } catch {
      continue;
    }
    if (!isLikelySecretScanPath(relPath, stat.size) && !isImportantLocalFile(relPath)) {
      continue;
    }
    try {
      const content = await fs.readFile(fullPath, "utf8");
      files.push({ path: relPath, content });
    } catch {
      // Binary or unreadable files are ignored.
    }
  }
}

function isImportantLocalFile(relPath: string): boolean {
  return [
    "README.md",
    "package.json",
    ".gitignore",
    "SECURITY.md",
    "LICENSE",
    "Dockerfile",
    ".dockerignore",
    "docker-compose.yml",
    "docker-compose.yaml",
    ".reposecignore",
    "reposec-baseline.json",
    ".reposec-baseline.json",
  ].includes(relPath);
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function loadHistoryFiles(
  root: string,
  maxCommits: number,
  maxFilesPerCommit: number,
): RepoFile[] {
  let commits: string[] = [];
  try {
    commits = git(root, ["rev-list", "--all", `--max-count=${maxCommits}`])
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }

  const files: RepoFile[] = [];
  for (const commit of commits) {
    let names: string[] = [];
    try {
      names = git(root, ["ls-tree", "-r", "--name-only", commit])
        .split(/\r?\n/)
        .filter((name) => isLikelySecretScanPath(name))
        .slice(0, maxFilesPerCommit);
    } catch {
      continue;
    }
    for (const name of names) {
      try {
        const content = git(root, ["show", `${commit}:${name}`]);
        if (!content) continue;
        files.push({
          path: `git-history/${commit.slice(0, 12)}/${name}`,
          content,
        });
      } catch {
        // Deleted/binary/unreadable historical blobs are ignored.
      }
    }
  }
  return files;
}

export async function loadLocalRepo(
  rootInput: string,
  options: LocalLoadOptions = {},
): Promise<RepoData> {
  const root = path.resolve(rootInput);
  const files: RepoFile[] = [];
  await walk(root, root, files);

  if (options.includeHistory) {
    files.push(
      ...loadHistoryFiles(
        root,
        options.maxHistoryCommits ?? 50,
        options.maxHistoryFilesPerCommit ?? 250,
      ),
    );
  }

  const fileTree = files.map((file) => file.path);
  const repoName = path.basename(root);
  const lockfiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"].filter(
    (p) => fileTree.includes(p),
  );

  return {
    metadata: {
      owner: "local",
      repo: repoName,
      defaultBranch: "local",
      description: "Local repository scan",
      stars: 0,
      forks: 0,
      openIssues: 0,
      isPrivate: true,
      htmlUrl: `file://${root.replace(/\\/g, "/")}`,
      language: null,
      sizeKb: undefined,
    },
    files,
    fileTree,
    workflows: fileTree.filter((p) => p.startsWith(".github/workflows/")),
    hasDependabot:
      fileTree.includes(".github/dependabot.yml") ||
      fileTree.includes(".github/dependabot.yaml"),
    hasWorkflows: fileTree.some((p) => p.startsWith(".github/workflows/")),
    hasIssueTemplate: fileTree.some((p) => p.startsWith(".github/ISSUE_TEMPLATE/")),
    hasCodeowners:
      fileTree.includes(".github/CODEOWNERS") || fileTree.includes("CODEOWNERS"),
    hasPullRequestTemplate:
      fileTree.includes(".github/PULL_REQUEST_TEMPLATE.md") ||
      fileTree.includes("PULL_REQUEST_TEMPLATE.md"),
    hasDockerfile: fileTree.some((p) => p === "Dockerfile" || /^Dockerfile\.[^/]+$/.test(p)),
    hasDockerignore: fileTree.includes(".dockerignore"),
    hasChangelog: fileTree.some((p) => p === "CHANGELOG.md" || p === "CHANGELOG"),
    hasContributing: fileTree.includes("CONTRIBUTING.md"),
    hasCodeOfConduct:
      fileTree.includes("CODE_OF_CONDUCT.md") ||
      fileTree.includes(".github/CODE_OF_CONDUCT.md"),
    primaryLockfile: lockfiles[0] ?? null,
    extraLockfiles: lockfiles.slice(1),
  };
}
