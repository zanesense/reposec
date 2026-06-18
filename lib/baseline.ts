import type { Finding, RepoFile } from "./types.ts";

interface BaselineJson {
  ignore?: Array<
    | string
    | {
        id?: string;
        fingerprint?: string;
        file?: string;
        line?: number;
        title?: string;
      }
  >;
}

function parseIgnoreLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function parseBaselineJson(content: string): BaselineJson | null {
  try {
    const parsed = JSON.parse(content) as BaselineJson;
    if (!parsed || !Array.isArray(parsed.ignore)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function findingLocation(finding: Finding): string | null {
  if (!finding.file) return null;
  return finding.line ? `${finding.file}:${finding.line}` : finding.file;
}

function matchesStringToken(finding: Finding, token: string): boolean {
  return (
    finding.id === token ||
    finding.fingerprint === token ||
    finding.file === token ||
    findingLocation(finding) === token ||
    finding.title === token
  );
}

export function applyRepoBaseline(
  findings: Finding[],
  files: RepoFile[],
): { findings: Finding[]; suppressed: number } {
  const tokens = new Set<string>();
  const structured: NonNullable<BaselineJson["ignore"]> = [];

  for (const file of files) {
    if (file.path === ".reposecignore") {
      for (const token of parseIgnoreLines(file.content)) tokens.add(token);
    }
    if (file.path === "reposec-baseline.json" || file.path === ".reposec-baseline.json") {
      const parsed = parseBaselineJson(file.content);
      if (!parsed) continue;
      for (const item of parsed.ignore ?? []) {
        if (typeof item === "string") tokens.add(item);
        else structured.push(item);
      }
    }
  }

  if (tokens.size === 0 && structured.length === 0) {
    return { findings, suppressed: 0 };
  }

  const kept: Finding[] = [];
  let suppressed = 0;
  for (const finding of findings) {
    let ignore = false;
    for (const token of tokens) {
      if (matchesStringToken(finding, token)) {
        ignore = true;
        break;
      }
    }
    if (!ignore) {
      for (const item of structured) {
        if (typeof item === "string") continue;
        if (item.id && item.id !== finding.id) continue;
        if (item.fingerprint && item.fingerprint !== finding.fingerprint) continue;
        if (item.file && item.file !== finding.file) continue;
        if (typeof item.line === "number" && item.line !== finding.line) continue;
        if (item.title && item.title !== finding.title) continue;
        ignore = true;
        break;
      }
    }
    if (ignore) suppressed++;
    else kept.push(finding);
  }

  return { findings: kept, suppressed };
}
