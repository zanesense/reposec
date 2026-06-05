import type { Severity, FindingCategory } from "./types";

export interface SecretPattern {
  name: string;
  regex: RegExp;
  severity: Severity;
  description: string;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "OpenAI API Key",
    regex: /\bsk-[A-Za-z0-9]{20,}/g,
    severity: "critical",
    description: "Looks like an OpenAI API key. Rotate immediately if real.",
  },
  {
    name: "GitHub Token",
    regex: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/g,
    severity: "critical",
    description:
      "Looks like a GitHub personal access or OAuth token. Revoke it if real.",
  },
  {
    name: "GitHub Fine-Grained Token",
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
    severity: "critical",
    description: "Looks like a GitHub fine-grained PAT. Revoke it if real.",
  },
  {
    name: "Slack Token",
    regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
    severity: "high",
    description: "Looks like a Slack token. Rotate it if real.",
  },
  {
    name: "Stripe Secret Key",
    regex: /\bsk_live_[A-Za-z0-9]{20,}/g,
    severity: "critical",
    description: "Looks like a live Stripe secret key. Roll the key if real.",
  },
  {
    name: "Stripe Test Key",
    regex: /\bsk_test_[A-Za-z0-9]{20,}/g,
    severity: "medium",
    description: "Looks like a Stripe test key. Keep test keys out of repos.",
  },
  {
    name: "Google API Key",
    regex: /\bAIza[0-9A-Za-z\-_]{35}/g,
    severity: "high",
    description: "Looks like a Google API key. Restrict and rotate if real.",
  },
  {
    name: "AWS Access Key ID",
    regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
    severity: "critical",
    description: "Looks like an AWS access key. Disable and rotate if real.",
  },
  {
    name: "AWS Secret Access Key",
    regex: /\baws(.{0,20})?(secret|sk)[^A-Za-z0-9]{0,5}[A-Za-z0-9/+=]{40}\b/gi,
    severity: "critical",
    description: "Possible AWS secret access key near a key id.",
  },
  {
    name: "Private Key Block",
    regex: /-----BEGIN (?:RSA |OPENSSH |DSA |EC |PGP )?PRIVATE KEY-----/g,
    severity: "critical",
    description: "Private key block in source. Move out and rotate immediately.",
  },
  {
    name: "Generic JWT",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    severity: "high",
    description: "Looks like a JWT. Treat as a secret and rotate if real.",
  },
  {
    name: "Database URL",
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\\+srv)?|redis):\/\/[^\s"'<>]+:[^\s"'<>]+@/gi,
    severity: "high",
    description:
      "Looks like a database URL with embedded credentials. Move to a secret manager.",
  },
  {
    name: "Generic API Key Assignment",
    regex:
      /\b(?:api[_-]?key|apikey|secret|token|password|passwd|pwd)\b\s*[:=]\s*["']([^"'\s]{12,})["']/gi,
    severity: "high",
    description:
      "Hardcoded credential-like assignment. Review and move to environment variables.",
  },
  {
    name: "JWT Secret Assignment",
    regex: /\bJWT[_-]?SECRET\b\s*[:=]\s*["']([^"'\s]{6,})["']/gi,
    severity: "high",
    description: "JWT secret committed to source. Move to a secret manager.",
  },
];

export interface RuleHit {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: FindingCategory;
  file?: string;
  line?: number;
  evidence?: string;
  fix: string;
  fixPrompt?: string;
}

const PLACEHOLDER_VALUES = new Set([
  "your-api-key",
  "changeme",
  "change-me",
  "example",
  "placeholder",
  "xxx",
  "xxxx",
  "your-key",
  "your-token",
  "<your-key>",
  "<your-token>",
  "todo",
  "fixme",
]);

const IGNORE_LINE_PREFIXES = ["#", "//", "/*", "*", "<!--"];

export function isLikelyPlaceholder(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  if (PLACEHOLDER_VALUES.has(v)) return true;
  if (/^[<[{]?[a-z_.\-]+[>\]}]?$/i.test(v)) return true;
  if (v.length < 8) return true;
  return false;
}

export function isCommentedLine(line: string): boolean {
  const t = line.trim();
  return IGNORE_LINE_PREFIXES.some((p) => t.startsWith(p));
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1,
};

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};
