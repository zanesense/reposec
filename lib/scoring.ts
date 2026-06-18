import type { Finding, ScoreBand, Severity } from "./types.ts";
import { SEVERITY_WEIGHT } from "./rules.ts";

export const SCORE_START = 100;

export function calculateScore(findings: Finding[]): number {
  const total = findings.reduce(
    (acc, f) => acc + (SEVERITY_WEIGHT[f.severity] ?? 0),
    0,
  );
  return Math.max(0, Math.min(SCORE_START, SCORE_START - total));
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 55) return "fair";
  if (score >= 30) return "weak";
  return "critical";
}

export const BAND_LABELS: Record<ScoreBand, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  weak: "Weak",
  critical: "Critical",
};

export const BAND_DESCRIPTIONS: Record<ScoreBand, string> = {
  excellent: "Repository hygiene is strong. Keep the rules running on every PR.",
  good: "Most hygiene rules pass. Address the high and medium items to reach excellent.",
  fair: "Several gaps to close. Tackle the high-severity findings first.",
  weak: "Many hygiene gaps detected. Treat the critical and high items as urgent.",
  critical: "Hygiene is failing on several fronts. Stop new work and fix the high-risk items first.",
};

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export function groupBySeverity(
  findings: Finding[],
): Record<Severity, Finding[]> {
  const grouped: Record<Severity, Finding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    info: [],
  };
  for (const f of findings) grouped[f.severity].push(f);
  return grouped;
}
