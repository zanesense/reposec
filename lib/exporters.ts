import type {
  CategoryBreakdown,
  CheckResult,
  FileGroup,
  Finding,
  FindingCategory,
  ScanReport,
  Severity,
} from "./types";
import { BAND_LABELS, groupBySeverity, SEVERITY_ORDER } from "./scoring";

const HEADING = (text: string) => `${text}\n${"-".repeat(text.length)}`;

function severityLabel(s: Severity): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function checkStatus(s: CheckResult["status"]): string {
  switch (s) {
    case "pass":
      return "PASS";
    case "fail":
      return "FAIL";
    case "warn":
      return "WARN";
    case "missing":
      return "MISSING";
    case "info":
      return "INFO";
    case "skip":
      return "SKIP";
  }
}

function findingLine(f: Finding): string {
  const loc = f.file
    ? f.line
      ? `\`${f.file}:${f.line}\``
      : `\`${f.file}\``
    : "_general_";
  const confidence = f.confidence
    ? `, ${f.verified ? "verified" : `${f.confidence} confidence`}`
    : "";
  return `- **${f.title}** (${severityLabel(f.severity)}${confidence}) \u2014 ${loc}\n  - _Why:_ ${f.description}\n  - _Fix:_ ${f.fix}`;
}

function categoryLabel(c: FindingCategory): string {
  switch (c) {
    case "environment":
      return "Environment & secrets";
    case "documentation":
      return "Documentation";
    case "package":
      return "Package & scripts";
    case "github":
      return "GitHub features";
    case "secret":
      return "Secret patterns";
    case "docker":
      return "Container hygiene";
    case "community":
      return "Community health";
    case "ci":
      return "CI quality";
    case "metadata":
      return "Repository metadata";
    case "code":
      return "Source code patterns";
    case "dependencies":
      return "Dependency hygiene";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toUTCString();
  } catch {
    return iso;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function repoMetadataBlock(report: ScanReport): string {
  const r = report.repo;
  const lines: string[] = [];
  lines.push(`- **Repository:** [${r.owner}/${r.repo}](${r.htmlUrl})`);
  lines.push(`- **Description:** ${r.description?.trim() || "_(none)_"}`);
  if (r.language) lines.push(`- **Primary language:** ${r.language}`);
  if (r.licenseSpdxId)
    lines.push(`- **License:** ${r.licenseSpdxId}${r.licenseName ? ` (${r.licenseName})` : ""}`);
  lines.push(`- **Default branch:** \`${r.defaultBranch}\``);
  lines.push(
    `- **Stars / forks / open issues:** ${(r.stars ?? 0).toLocaleString()} / ${(r.forks ?? 0).toLocaleString()} / ${(r.openIssues ?? 0).toLocaleString()}`,
  );
  if (typeof r.sizeKb === "number")
    lines.push(`- **Repository size:** ${(r.sizeKb / 1024).toFixed(2)} MB`);
  if (r.pushedAt) lines.push(`- **Last push:** ${formatDate(r.pushedAt)}`);
  if (r.archived) lines.push(`- **Archived:** yes`);
  if (r.isTemplate) lines.push(`- **Template repository:** yes`);
  if (r.topics && r.topics.length > 0)
    lines.push(`- **Topics:** ${r.topics.map((t) => `\`${t}\``).join(", ")}`);
  lines.push(`- **Scanned at:** ${formatDate(report.scannedAt)}`);
  lines.push(`- **Duration:** ${formatDuration(report.durationMs)}`);
  return lines.join("\n");
}

function categoryBreakdownBlock(by: Record<FindingCategory, CategoryBreakdown>): string {
  return Object.entries(by)
    .filter(([, v]) => v.total > 0)
    .map(([k, v]) => {
      const ratio = v.total === 0 ? 0 : Math.round((v.passed / v.total) * 100);
      return `- **${categoryLabel(k as FindingCategory)}:** ${v.passed} / ${v.total} passed (${ratio}%)`;
    })
    .join("\n");
}

function checksTableBlock(checks: CheckResult[]): string {
  const rows = checks
    .map(
      (c) =>
        `| ${checkStatus(c.status)} | ${categoryLabel(c.category)} | ${c.title} | ${c.file ? `\`${c.file}\`` : "_\u2014_"} | ${c.message.replace(/\|/g, "\\|").slice(0, 200)} |`,
    )
    .join("\n");
  return [
    `| Status | Category | Check | File | Detail |`,
    `| ------ | -------- | ----- | ---- | ------ |`,
    rows,
  ].join("\n");
}

function findingsByFileBlock(groups: FileGroup[]): string {
  if (groups.length === 0) return "_No file-level findings._";
  return groups
    .map((g) => {
      const counts = SEVERITY_ORDER.filter((s) => g.counts[s] > 0)
        .map((s) => `${g.counts[s]} ${severityLabel(s).toLowerCase()}`)
        .join(", ");
      return [
        `### \`${g.path}\` (${g.findings.length} finding${g.findings.length === 1 ? "" : "s"} \u2014 ${counts})`,
        ``,
        ...g.findings.map(
          (f) =>
            `- **${f.title}** (${severityLabel(f.severity)})${f.line ? ` \u2014 line ${f.line}` : ""}\n  - _Fix:_ ${f.fix}`,
        ),
        ``,
      ].join("\n");
    })
    .join("\n");
}

function findingsByCategoryBlock(findings: Finding[]): string {
  const grouped = new Map<FindingCategory, Finding[]>();
  for (const f of findings) {
    if (!grouped.has(f.category)) grouped.set(f.category, []);
    grouped.get(f.category)!.push(f);
  }
  if (grouped.size === 0) return "_No findings._";
  return Array.from(grouped.entries())
    .map(([cat, items]) => {
      return [
        `### ${categoryLabel(cat)} (${items.length})`,
        ``,
        ...items.map(findingLine),
        ``,
      ].join("\n");
    })
    .join("\n");
}

export function generateMarkdownReport(report: ScanReport): string {
  const grouped = groupBySeverity(report.findings);
  const counts = SEVERITY_ORDER.map(
    (s) => `- ${severityLabel(s)}: ${grouped[s].length}`,
  ).join("\n");

  const findingsBlock = SEVERITY_ORDER.flatMap((s) => grouped[s])
    .map(findingLine)
    .join("\n");

  const missing = report.summary.filesMissing.length
    ? report.summary.filesMissing.map((f) => `- \`${f}\``).join("\n")
    : "_None \u2014 all expected files are present._";

  return [
    `# RepoSec Security Report`,
    ``,
    repoMetadataBlock(report),
    ``,
    HEADING("Security Score"),
    ``,
    `**Score:** ${report.score} / 100 \u2014 ${BAND_LABELS[report.scoreBand]}`,
    ``,
    HEADING("Scan summary"),
    ``,
    `- **Checks performed:** ${report.summary.totalChecks}`,
    `- **Checks passed:** ${report.summary.passed}`,
    `- **Checks failed:** ${report.summary.failed}`,
    `- **Total findings:** ${report.summary.totalFindings}`,
    `- **Files checked:** ${report.summary.filesChecked}`,
    `- **Missing files:** ${report.summary.filesMissing.length}`,
    ``,
    HEADING("Findings by severity"),
    ``,
    counts,
    ``,
    HEADING("Checks by category"),
    ``,
    categoryBreakdownBlock(report.summary.byCategory),
    ``,
    HEADING("Checks performed"),
    ``,
    checksTableBlock(report.summary.checks),
    ``,
    HEADING("Missing files"),
    ``,
    missing,
    ``,
    HEADING("Findings by file"),
    ``,
    findingsByFileBlock(report.fileGroups),
    ``,
    HEADING("All findings (grouped by category)"),
    ``,
    findingsByCategoryBlock(report.findings) ||
      "_No findings \u2014 the repository looks clean on the checks we ran._",
    ``,
    HEADING("All findings (flat list)"),
    ``,
    findingsBlock || "_No findings._",
    ``,
    HEADING("Files inspected"),
    ``,
    report.filesChecked.map((f) => `- \`${f}\``).join("\n"),
    ``,
    HEADING("Disclaimer"),
    ``,
    `_RepoSec is a static, rule-based scanner. Findings are hints, not guarantees.${" "}Heuristics can produce false positives; review every finding before changing production code._`,
  ].join("\n");
}

export function generateJsonReport(report: ScanReport): string {
  return JSON.stringify(report, null, 2);
}

function sarifLevel(severity: Severity): "error" | "warning" | "note" {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "medium" || severity === "low") return "warning";
  return "note";
}

function sarifRuleId(finding: Finding): string {
  const base = finding.id.split("-").slice(0, 3).join("-");
  return base || finding.category;
}

export function generateSarifReport(report: ScanReport): string {
  const rules = new Map<string, Finding>();
  for (const finding of report.findings) {
    const id = sarifRuleId(finding);
    if (!rules.has(id)) rules.set(id, finding);
  }

  return JSON.stringify(
    {
      version: "2.1.0",
      $schema:
        "https://json.schemastore.org/sarif-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: "RepoSec",
              informationUri: "https://github.com/zanesense/reposec",
              rules: Array.from(rules.entries()).map(([id, finding]) => ({
                id,
                name: finding.title,
                shortDescription: { text: finding.title },
                fullDescription: { text: finding.description },
                help: { text: finding.fix },
                properties: {
                  category: finding.category,
                  severity: finding.severity,
                  confidence: finding.confidence ?? "medium",
                },
              })),
            },
          },
          results: report.findings.map((finding) => ({
            ruleId: sarifRuleId(finding),
            level: sarifLevel(finding.severity),
            message: {
              text: `${finding.title}: ${finding.description}`,
            },
            locations: finding.file
              ? [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: finding.file },
                      region: finding.line
                        ? { startLine: finding.line }
                        : undefined,
                    },
                  },
                ]
              : [],
            fingerprints: finding.fingerprint
              ? { secretFingerprint: finding.fingerprint }
              : undefined,
            properties: {
              category: finding.category,
              severity: finding.severity,
              confidence: finding.confidence ?? "medium",
              verified: finding.verified ?? false,
              evidence: finding.evidence,
              remediation: finding.fix,
            },
          })),
        },
      ],
    },
    null,
    2,
  );
}

export function generateSecurityMdTemplate(): string {
  return `# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| older   | :x:                |

## Reporting a Vulnerability

If you discover a security issue, please email **security@example.com** instead of
opening a public issue. Include:

- A clear description of the issue
- Steps to reproduce
- The impact you believe it has
- Any suggested fix (optional)

We aim to acknowledge new reports within **3 business days** and ship a fix or
mitigation within **30 days** for high-severity issues.

## Scope

This policy applies to the code in this repository and any official packages we
publish. It does not cover social engineering, physical attacks, or denial of
service.
`;
}

export function generateEnvExampleTemplate(): string {
  return `# Copy this file to .env and fill in the values for your environment.
# Never commit a real .env file. Keep secrets out of version control.

# --- Core ---
NODE_ENV=development
PORT=3000

# --- Database ---
# DATABASE_URL=postgres://user:password@localhost:5432/app

# --- Auth ---
# JWT_SECRET=replace-with-a-long-random-string
# SESSION_SECRET=replace-with-a-long-random-string

# --- External APIs ---
# OPENAI_API_KEY=
# STRIPE_SECRET_KEY=
# GITHUB_TOKEN=
`;
}

export function generateIssueChecklist(report: ScanReport): string {
  const grouped = groupBySeverity(report.findings);
  const items = SEVERITY_ORDER.flatMap((s) => grouped[s]);
  const checklist = items
    .map(
      (f) =>
        `- [ ] **${severityLabel(f.severity)}** \u2014 ${f.title}${
          f.file ? ` _(${f.file}${f.line ? `:${f.line}` : ""})_` : ""
        }`,
    )
    .join("\n");

  return [
    `## RepoSec follow-up`,
    ``,
    `Repository: ${report.repo.owner}/${report.repo.repo}`,
    `Score: **${report.score} / 100** (${BAND_LABELS[report.scoreBand]})`,
    ``,
    `### Checklist`,
    ``,
    checklist || `- [ ] No findings \u2014 the repository looks clean on the checks we ran.`,
    ``,
    `### Suggested order`,
    ``,
    `1. Rotate or remove any exposed secrets.`,
    `2. Add the missing hygiene files (SECURITY.md, .env.example, .gitignore).`,
    `3. Wire up Dependabot and a basic CI workflow.`,
    `4. Document setup and environment variables in the README.`,
  ].join("\n");
}

export function generateFixPrompt(report: ScanReport): string {
  const grouped = groupBySeverity(report.findings);
  const top = SEVERITY_ORDER.flatMap((s) => grouped[s]).slice(0, 12);

  const items = top
    .map(
      (f, i) =>
        `${i + 1}. **${f.title}** (${severityLabel(f.severity)})${
          f.file ? ` \u2014 \`${f.file}${f.line ? `:${f.line}` : ""}\`` : ""
        }\n   Fix: ${f.fix}`,
    )
    .join("\n");

  return `You are a defensive security assistant. Review this RepoSec report and fix the high-risk items first.

Repository: ${report.repo.owner}/${report.repo.repo}
Score: ${report.score} / 100 (${BAND_LABELS[report.scoreBand]})

Top issues:
${items || "- No findings \u2014 the repository looks clean."}

Rules:
- Do not rewrite unrelated files.
- Do not expose secrets, tokens, or credentials in source.
- Use placeholders for any environment variable value (e.g. KEY=value).
- Add .env.example with placeholder values only.
- Update .gitignore to cover .env, build output, and dependencies.
- Add SECURITY.md with responsible-disclosure instructions.
- Improve README setup and environment variable sections.
- Explain every change after editing.

When you are done, summarize what you changed and what still needs a human review.`;
}

export interface DownloadPayload {
  filename: string;
  mime: string;
  content: string;
}

export function buildDownload(
  report: ScanReport,
  kind:
    | "report"
    | "security-md"
    | "env-example"
    | "issue"
    | "fix-prompt"
    | "json"
    | "sarif",
): DownloadPayload {
  switch (kind) {
    case "report":
      return {
        filename: `reposec-${report.repo.owner}-${report.repo.repo}.md`,
        mime: "text/markdown",
        content: generateMarkdownReport(report),
      };
    case "security-md":
      return {
        filename: "SECURITY.md",
        mime: "text/markdown",
        content: generateSecurityMdTemplate(),
      };
    case "env-example":
      return {
        filename: ".env.example",
        mime: "text/plain",
        content: generateEnvExampleTemplate(),
      };
    case "issue":
      return {
        filename: `reposec-issues-${report.repo.owner}-${report.repo.repo}.md`,
        mime: "text/markdown",
        content: generateIssueChecklist(report),
      };
    case "fix-prompt":
      return {
        filename: `reposec-fix-prompt.md`,
        mime: "text/markdown",
        content: generateFixPrompt(report),
      };
    case "json":
      return {
        filename: `reposec-${report.repo.owner}-${report.repo.repo}.json`,
        mime: "application/json",
        content: generateJsonReport(report),
      };
    case "sarif":
      return {
        filename: `reposec-${report.repo.owner}-${report.repo.repo}.sarif`,
        mime: "application/sarif+json",
        content: generateSarifReport(report),
      };
  }
}
