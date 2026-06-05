#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadLocalRepo } from "../lib/local-repo.ts";
import { runScan } from "../lib/scanner.ts";
import { calculateScore, scoreBand } from "../lib/scoring.ts";
import {
  generateJsonReport,
  generateMarkdownReport,
  generateSarifReport,
} from "../lib/exporters.ts";
import type { ScanReport } from "../lib/types.ts";
import { verifyFindings } from "../lib/verification.ts";

type ColorName = "red" | "yellow" | "blue" | "cyan" | "green" | "gray" | "bold";

const ANSI: Record<ColorName | "reset", string> = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  gray: "\x1b[90m",
};

function color(text: string, name: ColorName, enabled: boolean): string {
  return enabled ? `${ANSI[name]}${text}${ANSI.reset}` : text;
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

function colorizeMarkdownReport(output: string, report: ScanReport, enabled: boolean): string {
  if (!enabled) return output;

  const lines = output.split("\n");
  return lines
    .map((line, index) => {
      if (line.startsWith("# ")) return color(line, "bold", true);
      if (/^-{3,}$/.test(line)) return color(line, "gray", true);
      if (
        /^[A-Za-z].*$/.test(line) &&
        /^-+$/.test(lines[index + 1] ?? "") &&
        !line.startsWith("-") &&
        !line.includes(":")
      ) {
        return color(line, "cyan", true);
      }
      if (line.startsWith("**Score:**")) {
        return line.replace(
          `${report.score} / 100`,
          color(`${report.score} / 100`, scoreColor(report.score), true),
        );
      }
      return line
        .replace(
          /^- (Critical|High|Medium|Low|Info):/i,
          (match, severity: string) => `- ${color(`${severity}:`, severityColor(severity), true)}`,
        )
        .replace(
          /\((Critical|High|Medium|Low|Info)([,)]?)/g,
          (_match, severity: string, suffix: string) =>
            `(${color(severity, severityColor(severity), true)}${suffix}`,
        )
        .replace(/\b(pass|passed)\b/gi, (match) => color(match, "green", true))
        .replace(/\b(fail|failed)\b/gi, (match) => color(match, "red", true))
        .replace(/\b(warn|warning)\b/gi, (match) => color(match, "yellow", true))
        .replace(/\b(info)\b/gi, (match) => color(match, "blue", true));
    })
    .join("\n");
}

function usage(useColor = shouldUseColor("auto", "markdown", null)): never {
  console.log(`${color("RepoSec CLI", "bold", useColor)}

Usage:
  reposec [path] [--history] [--format markdown|json|sarif] [--out file] [--verify]

Options:
  --history          Include recent git history blobs in the scan.
  --format <kind>    Output format. Defaults to markdown.
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

const args = process.argv.slice(2);
let root = ".";
let includeHistory = false;
let format: "markdown" | "json" | "sarif" = "markdown";
let outFile: string | null = null;
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

const started = Date.now();
const repo = await loadLocalRepo(root, { includeHistory });
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
  console.log(colorizeMarkdownReport(output, report, shouldUseColor(colorMode, format, outFile)));
}
