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

function usage(): never {
  console.log(`RepoSec CLI

Usage:
  npm run scan:local -- [path] [--history] [--format markdown|json|sarif] [--out file] [--verify]

Options:
  --history          Include recent git history blobs in the scan.
  --format <kind>    Output format. Defaults to markdown.
  --out <file>       Write output to a file instead of stdout.
  --verify           Opt in to safe provider verification where supported.
`);
  process.exit(1);
}

const args = process.argv.slice(2);
let root = ".";
let includeHistory = false;
let format: "markdown" | "json" | "sarif" = "markdown";
let outFile: string | null = null;
let verify = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--help" || arg === "-h") usage();
  if (arg === "--history") {
    includeHistory = true;
    continue;
  }
  if (arg === "--verify") {
    verify = true;
    continue;
  }
  if (arg === "--format") {
    const next = args[++i];
    if (next !== "markdown" && next !== "json" && next !== "sarif") usage();
    format = next;
    continue;
  }
  if (arg === "--out") {
    outFile = args[++i] ?? null;
    if (!outFile) usage();
    continue;
  }
  if (arg.startsWith("--")) usage();
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
  console.log(output);
}
