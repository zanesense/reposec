#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadLocalRepo } from "../lib/local-repo.ts";
import { fetchClientBundleFiles } from "../lib/client-bundle.ts";
import { runScan } from "../lib/scanner.ts";
import {
  BAND_LABELS,
  calculateScore,
  groupBySeverity,
  scoreBand,
  SEVERITY_ORDER,
} from "../lib/scoring.ts";
import {
  generateJsonReport,
  generateMarkdownReport,
  generateSarifReport,
} from "../lib/exporters.ts";
import type { ScanReport } from "../lib/types.ts";
import { verifyFindings } from "../lib/verification.ts";

type ColorName =
  | "red"
  | "yellow"
  | "blue"
  | "cyan"
  | "green"
  | "gray"
  | "bold"
  | "dim"
  | "black"
  | "bgMagenta";

const ANSI: Record<ColorName | "reset", string> = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  black: "\x1b[30m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  gray: "\x1b[90m",
  bgMagenta: "\x1b[45m",
};

function color(text: string, name: ColorName, enabled: boolean): string {
  return style(text, enabled, name);
}

function style(text: string, enabled: boolean, ...names: ColorName[]): string {
  return enabled ? `${names.map((name) => ANSI[name]).join("")}${text}${ANSI.reset}` : text;
}

function scoreColor(score: number): ColorName {
  if (score >= 85) return "green";
  if (score >= 70) return "cyan";
  if (score >= 50) return "yellow";
  return "red";
}

function severityColor(severity: string): ColorName {
  switch (severity.toLowerCase()) {
    case "critical":
    case "high":
      return "red";
    case "medium":
      return "yellow";
    case "low":
      return "blue";
    default:
      return "gray";
  }
}

function severityLabel(severity: string): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function plural(n: number, one: string): string {
  return `${n.toLocaleString()} ${one}${n === 1 ? "" : "s"}`;
}

function gradient(text: string, enabled: boolean): string {
  if (!enabled) return text;
  const colors = [198, 204, 202, 208, 214, 220, 226, 221];
  return Array.from(text)
    .map((char, index) =>
      char === " " ? char : `\x1b[38;5;${colors[index % colors.length]}m${char}\x1b[0m`,
    )
    .join("");
}

function isDeploymentPath(file: string | undefined): boolean {
  return file?.startsWith("client-bundle/") ?? false;
}

function orderedFindings(findings: ScanReport["findings"]): ScanReport["findings"] {
  const grouped = groupBySeverity(findings);
  return SEVERITY_ORDER.flatMap((severity) => grouped[severity]);
}

function logo(enabled: boolean): string {
  return [
    "_______   ____ ______   ____  ______ ____   ____      ",
    "\\_  __ \\_/ __ \\\\____ \\ /  _ \\/  ___// __ \\_/ ___\\     ",
    " |  | \\/\\  ___/|  |_> >  <_> )___ \\\\  ___/\\  \\___     ",
    " |__|    \\___  >   __/ \\____/____  >\\___  >\\___  > /\\ ",
    "             \\/|__|              \\/     \\/     \\/  \\/ ",
  ]
    .map((line) => gradient(line, enabled))
    .join("\n");
}

function formatCliReport(
  report: ScanReport,
  enabled: boolean,
  siteUrl: string | null,
  clientBundleFileCount: number,
): string {
  const grouped = groupBySeverity(report.findings);
  const repoFindings = orderedFindings(
    report.findings.filter((finding) => !isDeploymentPath(finding.file)),
  );
  const deploymentFindings = orderedFindings(
    report.findings.filter((finding) => isDeploymentPath(finding.file)),
  );
  const repoFiles = report.fileGroups.filter((group) => !isDeploymentPath(group.path)).slice(0, 5);
  const deploymentFiles = report.fileGroups
    .filter((group) => isDeploymentPath(group.path))
    .slice(0, 5);
  const rail = color("│", "gray", enabled);
  const mark = (name: ColorName) => color("◇", name, enabled);
  const bullet = color("▫", "gray", enabled);
  const addFindingSection = (title: string, findings: ScanReport["findings"]) => {
    lines.push(rail, `${mark(findings.length ? "yellow" : "green")}  ${style(title, enabled, "bold")}`);
    if (findings.length === 0) {
      lines.push(`${rail}     ${color("done", "green", enabled)} ${color("No findings", "gray", enabled)}`);
      return;
    }
    findings.slice(0, 8).forEach((finding) => {
      const location = finding.file
        ? color(` ${finding.file}${finding.line ? `:${finding.line}` : ""}`, "gray", enabled)
        : "";
      lines.push(
        `${rail}     ${bullet} ${style(finding.title, enabled, "bold")} ${color(
          severityLabel(finding.severity),
          severityColor(finding.severity),
          enabled,
        )}${location}`,
        `${rail}       ${color(finding.fix, "gray", enabled)}`,
      );
    });
  };
  const addHotspotsSection = (title: string, groups: ScanReport["fileGroups"]) => {
    if (!groups.length) return;
    lines.push(rail, `${mark("green")}  ${style(title, enabled, "bold")}`);
    groups.forEach((group) => {
      const counts = SEVERITY_ORDER.filter((s) => group.counts[s] > 0)
        .map((s) => `${group.counts[s]} ${s}`)
        .join(", ");
      lines.push(
        `${rail}     ${bullet} ${style(group.path, enabled, "bold")} ${color(
          `${plural(group.findings.length, "finding")}${counts ? ` (${counts})` : ""}`,
          "gray",
          enabled,
        )}`,
      );
    });
  };

  const lines = [
    logo(enabled),
    "",
    `${style("RepoSec Security CLI", enabled, "bold")} ${color("v0.1.0", "gray", enabled)}  ${color(
      "Repository Security Scanner",
      "blue",
      enabled,
    )}`,
    color("Static hygiene scanning + secret pattern detection.", "gray", enabled),
    "",
    `${rail}  ${style(" reposec ", enabled, "black", "bgMagenta")} `,
    rail,
    `${mark("green")}  ${style("Target:", enabled, "bold")} ${report.repo.owner}/${report.repo.repo}`,
    rail,
    ...(siteUrl
      ? [
          `${mark(clientBundleFileCount ? "green" : "yellow")}  ${style(
            "Deployment:",
            enabled,
            "bold",
          )} ${siteUrl} ${color(
            `(${plural(clientBundleFileCount, "asset")} fetched)`,
            "gray",
            enabled,
          )}`,
          rail,
        ]
      : []),
    `${mark(scoreColor(report.score))}  ${style("Score:", enabled, "bold")} ${color(
      `${report.score} / 100`,
      scoreColor(report.score),
      enabled,
    )} ${color(BAND_LABELS[report.scoreBand], "gray", enabled)}`,
    rail,
    `${mark(report.summary.failed ? "yellow" : "green")}  ${style("Checks:", enabled, "bold")} ${
      report.summary.passed
    } passed, ${report.summary.failed} failed ${color(
      `(${plural(report.summary.totalChecks, "check")} total)`,
      "gray",
      enabled,
    )}`,
    `${mark(report.summary.totalFindings ? "yellow" : "green")}  ${style(
      "Findings:",
      enabled,
      "bold",
    )} ${plural(repoFindings.length, "repo finding")}, ${plural(
      deploymentFindings.length,
      "deployment finding",
    )}, ${color(
      `${plural(report.filesChecked.length, "file")} inspected`,
      "gray",
      enabled,
    )}`,
    `${mark("blue")}  ${style("Severity:", enabled, "bold")} ${SEVERITY_ORDER.map(
      (severity) =>
        `${color(severityLabel(severity), severityColor(severity), enabled)} ${grouped[
          severity
        ].length}`,
    ).join(color(" / ", "gray", enabled))}`,
  ];

  if (report.summary.filesMissing.length) {
    lines.push(rail, `${mark("yellow")}  ${style("Missing files", enabled, "bold")}`);
    report.summary.filesMissing.slice(0, 8).forEach((file, index, list) => {
      const hidden = report.summary.filesMissing.length - list.length;
      lines.push(`${rail}     ${bullet} ${color(file, "gray", enabled)}`);
      if (index === list.length - 1 && hidden > 0) {
        lines.push(`${rail}     ${bullet} ${color(`${hidden.toLocaleString()} more`, "gray", enabled)}`);
      }
    });
  }

  addFindingSection("Repository findings", repoFindings);
  if (siteUrl || deploymentFindings.length > 0) {
    addFindingSection("Deployment findings", deploymentFindings);
  }

  addHotspotsSection("Repository hotspots", repoFiles);
  addHotspotsSection("Deployment hotspots", deploymentFiles);

  lines.push(rail, `${mark("green")}  ${style("scan", enabled, "bold")} ${color("done", "green", enabled)} ${color(`${report.durationMs}ms`, "gray", enabled)} .`);

  return lines.join("\n");
}

function usage(useColor = shouldUseColor("auto", "markdown", null)): never {
  console.log(`${color("RepoSec CLI", "bold", useColor)}

Usage:
  reposec [path] [--site url] [--history] [--format markdown|json|sarif] [--out file] [--verify]

Options:
  --site <url>       Fetch deployed app JS bundles and source maps before scanning.
  --history          Include recent git history blobs in the scan.
  --format <kind>    Output format. Defaults to markdown (tree UI on stdout).
  --out <file>       Write output to a file instead of stdout.
  --verify           Opt in to safe provider verification where supported.
  --color            Force colored terminal output for markdown reports.
  --no-color         Disable colored terminal output.
`);
  process.exit(1);
}

function shouldUseColor(
  colorMode: "auto" | "always" | "never",
  format: "markdown" | "json" | "sarif",
  outFile: string | null,
): boolean {
  if (format !== "markdown" || outFile) return false;
  if (colorMode === "always") return true;
  if (colorMode === "never" || process.env.NO_COLOR) return false;
  return Boolean(process.stdout.isTTY || process.env.FORCE_COLOR);
}

function clearTerminal(format: "markdown" | "json" | "sarif", outFile: string | null): void {
  if (format === "markdown" && !outFile && process.stdout.isTTY) {
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
  }
}

const args = process.argv.slice(2);
let root = ".";
let includeHistory = false;
let format: "markdown" | "json" | "sarif" = "markdown";
let outFile: string | null = null;
let siteUrl: string | null = null;
let verify = false;
let colorMode: "auto" | "always" | "never" = "auto";

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--help" || arg === "-h") usage(shouldUseColor(colorMode, "markdown", null));
  if (arg === "--history") {
    includeHistory = true;
    continue;
  }
  if (arg === "--verify") {
    verify = true;
    continue;
  }
  if (arg === "--site" || arg === "--site-url" || arg === "--deployment-url") {
    siteUrl = args[++i] ?? null;
    if (!siteUrl) usage(shouldUseColor(colorMode, format, outFile));
    continue;
  }
  if (arg === "--color") {
    colorMode = "always";
    continue;
  }
  if (arg === "--no-color") {
    colorMode = "never";
    continue;
  }
  if (arg === "--format") {
    const next = args[++i];
    if (next !== "markdown" && next !== "json" && next !== "sarif") {
      usage(shouldUseColor(colorMode, "markdown", null));
    }
    format = next;
    continue;
  }
  if (arg === "--out") {
    outFile = args[++i] ?? null;
    if (!outFile) usage(shouldUseColor(colorMode, format, outFile));
    continue;
  }
  if (arg.startsWith("--")) usage(shouldUseColor(colorMode, format, outFile));
  root = arg;
}

clearTerminal(format, outFile);

const started = Date.now();
const repo = await loadLocalRepo(root, { includeHistory });
const clientBundleFiles = await fetchClientBundleFiles(siteUrl);
if (clientBundleFiles.length > 0) {
  repo.files = [...repo.files, ...clientBundleFiles];
  repo.fileTree = [...repo.fileTree, ...clientBundleFiles.map((file) => file.path)];
}
const result = runScan(repo, { collectSecretCandidates: verify });
if (verify) {
  await verifyFindings(result.findings, result.secretCandidates);
}
const score = calculateScore(result.findings);
const report: ScanReport = {
  repo: repo.metadata,
  score,
  scoreBand: scoreBand(score),
  summary: result.summary,
  findings: result.findings,
  filesChecked: result.filesChecked,
  fileGroups: result.fileGroups,
  scannedAt: new Date().toISOString(),
  durationMs: Date.now() - started,
};

const output =
  format === "json"
    ? generateJsonReport(report)
    : format === "sarif"
      ? generateSarifReport(report)
      : generateMarkdownReport(report);

if (outFile) {
  await writeFile(path.resolve(outFile), output, "utf8");
} else {
  const useColor = shouldUseColor(colorMode, format, outFile);
  console.log(
    format === "markdown"
      ? formatCliReport(report, useColor, siteUrl, clientBundleFiles.length)
      : output,
  );
}
