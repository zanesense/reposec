import type { Severity, FindingCategory } from "./types.ts";

export interface SecretPattern {
  name: string;
  needles: string[];
  regex: RegExp;
  severity: Severity;
  description: string;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "OpenAI API Key",
    needles: ["sk-"],
    regex: /\bsk-[A-Za-z0-9_-]{20,}/g,
    severity: "critical",
    description: "Looks like an OpenAI API key. Rotate immediately if real.",
  },
  {
    name: "Anthropic API Key",
    needles: ["sk-ant-"],
    regex: /\bsk-ant-(?:api03-)?[A-Za-z0-9_-]{20,}/g,
    severity: "critical",
    description:
      "Looks like an Anthropic API key. Rotate immediately if real.",
  },
  {
    name: "Groq API Key",
    needles: ["gsk_"],
    regex: /\bgsk_[A-Za-z0-9]{20,}/g,
    severity: "critical",
    description: "Looks like a Groq API key. Rotate immediately if real.",
  },
  {
    name: "HuggingFace Token",
    needles: ["hf_"],
    regex: /\bhf_[A-Za-z0-9]{30,}/g,
    severity: "high",
    description: "Looks like a HuggingFace token. Revoke it if real.",
  },
  {
    name: "GitHub Token",
    needles: ["ghp_", "gho_", "ghu_", "ghs_", "ghr_", "github_pat_"],
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|github_pat_[A-Za-z0-9_]{20,}/g,
    severity: "critical",
    description:
      "Looks like a GitHub personal access or OAuth token. Revoke it if real.",
  },
  {
    name: "GitLab Token",
    needles: ["glpat-", "gloas-", "glrt-"],
    regex: /\bgl(?:pat|oas|rt)-[A-Za-z0-9_-]{20,}/g,
    severity: "critical",
    description: "Looks like a GitLab token. Revoke it if real.",
  },
  {
    name: "npm Token",
    needles: ["npm_"],
    regex: /\bnpm_[A-Za-z0-9]{36,}/g,
    severity: "critical",
    description: "Looks like an npm publish token. Revoke it if real.",
  },
  {
    name: "PyPI Token",
    needles: ["pypi-"],
    regex: /\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{20,}/g,
    severity: "critical",
    description: "Looks like a PyPI upload token. Revoke it if real.",
  },
  {
    name: "Slack Token",
    needles: ["xox"],
    regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
    severity: "high",
    description: "Looks like a Slack token. Rotate it if real.",
  },
  {
    name: "Discord Bot Token",
    needles: [],
    regex:
      /\b[MN][A-Za-z0-9]{23,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{27,}\b/g,
    severity: "critical",
    description: "Looks like a Discord bot token. Regenerate the bot if real.",
  },
  {
    name: "Telegram Bot Token",
    needles: [],
    regex: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g,
    severity: "critical",
    description: "Looks like a Telegram bot token. Revoke via BotFather if real.",
  },
  {
    name: "Twilio API Key",
    needles: ["SK", "AC"],
    regex: /\bSK[a-fA-F0-9]{32}\b/g,
    severity: "high",
    description: "Looks like a Twilio API key SID. Rotate it if real.",
  },
  {
    name: "SendGrid API Key",
    needles: ["SG."],
    regex: /\bSG\.[A-Za-z0-9_-]{22,}\.[A-Za-z0-9_-]{43,}\b/g,
    severity: "high",
    description: "Looks like a SendGrid API key. Revoke it if real.",
  },
  {
    name: "Mailgun API Key",
    needles: ["key-"],
    regex: /\bkey-[a-f0-9]{32}\b/g,
    severity: "high",
    description: "Looks like a Mailgun API key. Rotate it if real.",
  },
  {
    name: "Stripe Secret Key",
    needles: ["sk_live_"],
    regex: /\bsk_live_[A-Za-z0-9]{20,}/g,
    severity: "critical",
    description: "Looks like a live Stripe secret key. Roll the key if real.",
  },
  {
    name: "Stripe Test Key",
    needles: ["sk_test_"],
    regex: /\bsk_test_[A-Za-z0-9]{20,}/g,
    severity: "medium",
    description: "Looks like a Stripe test key. Keep test keys out of repos.",
  },
  {
    name: "Google API Key",
    needles: ["AIza"],
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
    severity: "high",
    description: "Looks like a Google API key. Restrict and rotate if real.",
  },
  {
    name: "AWS Access Key ID",
    needles: ["AKIA", "ASIA"],
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    severity: "critical",
    description: "Looks like an AWS access key. Disable and rotate if real.",
  },
  {
    name: "AWS Secret Access Key",
    needles: ["aws_secret", "aws_sk"],
    regex:
      /\baws[_-]?(?:secret|sk)[^A-Za-z0-9]{0,5}[A-Za-z0-9/+=]{40}\b/gi,
    severity: "critical",
    description: "Possible AWS secret access key near a key id.",
  },
  {
    name: "Supabase Token",
    needles: ["sbp_", "sb_secret_"],
    regex: /\bsbp_[a-f0-9]{40,}\b|sb_secret_[A-Za-z0-9_-]{40,}/g,
    severity: "critical",
    description: "Looks like a Supabase service-role key. Rotate it if real.",
  },
  {
    name: "Linear API Key",
    needles: ["lin_api_"],
    regex: /\blin_api_[A-Za-z0-9]{40,}/g,
    severity: "high",
    description: "Looks like a Linear API key. Revoke it if real.",
  },
  {
    name: "Shopify Token",
    needles: ["shpat_", "shpca_", "shppa_", "shpss_"],
    regex: /\b(?:shpat|shpca|shppa|shpss)_[a-fA-F0-9]{32,}\b/g,
    severity: "critical",
    description: "Looks like a Shopify access token. Revoke it if real.",
  },
  {
    name: "PlanetScale Token",
    needles: ["pscale_tkn_"],
    regex: /\bpscale_tkn_[A-Za-z0-9_-]{40,}/g,
    severity: "critical",
    description: "Looks like a PlanetScale token. Revoke it if real.",
  },
  {
    name: "1Password Service Account",
    needles: ["ops_"],
    regex: /\bops_[A-Za-z0-9]{40,}/g,
    severity: "critical",
    description: "Looks like a 1Password service-account token. Revoke it if real.",
  },
  {
    name: "Doppler CLI Token",
    needles: ["dp.st."],
    regex: /\bdp\.st\.[A-Za-z0-9_-]{40,}/g,
    severity: "critical",
    description: "Looks like a Doppler CLI token. Revoke it if real.",
  },
  {
    name: "Postman API Key",
    needles: ["PMAK-"],
    regex: /\bPMAK-[A-Za-z0-9-]{60,}\b/g,
    severity: "high",
    description: "Looks like a Postman API key. Revoke it if real.",
  },
  {
    name: "Mapbox Secret Token",
    needles: ["sk.eyJ"],
    regex: /\bsk\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
    severity: "high",
    description: "Looks like a Mapbox secret access token. Restrict and rotate if real.",
  },
  {
    name: "Private Key Block",
    needles: ["-----BEGIN"],
    regex:
      /-----BEGIN (?:RSA |OPENSSH |DSA |EC |PGP |ENCRYPTED )?PRIVATE KEY-----/g,
    severity: "critical",
    description:
      "Private key block in source. Move out and rotate immediately.",
  },
  {
    name: "SSH Public Key (informational)",
    needles: ["ssh-rsa", "ssh-ed25519"],
    regex: /\b(?:ssh-rsa|ssh-ed25519|ecdsa-sha2-[a-z0-9-]+) AAAA[A-Za-z0-9+/=]{50,}/g,
    severity: "low",
    description:
      "SSH public key in source. Public keys are not secret, but review whether it should be committed.",
  },
  {
    name: "Generic JWT",
    needles: ["eyJ"],
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    severity: "high",
    description: "Looks like a JWT. Treat as a secret and rotate if real.",
  },
  {
    name: "Database URL with Credentials",
    needles: ["postgres://", "postgresql://", "mysql://", "mongodb://", "redis://"],
    regex:
      /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s"'<>]+:[^\s"'<>]+@/gi,
    severity: "high",
    description:
      "Looks like a database URL with embedded credentials. Move to a secret manager.",
  },
  {
    name: ".npmrc _authToken",
    needles: ["_authToken"],
    regex: /_authToken\s*=\s*[A-Za-z0-9._-]+/g,
    severity: "critical",
    description:
      "npm auth token in .npmrc. Revoke the token on npmjs.com and remove this file from the repo.",
  },
  {
    name: ".pypirc password",
    needles: ["[pypi]", "password"],
    regex: /^\s*password\s*=\s*[^\s#]+/gim,
    severity: "critical",
    description:
      "PyPI password in .pypirc. Rotate the token and remove this file from the repo.",
  },
  {
    name: ".netrc password",
    needles: ["machine ", "password "],
    regex: /^\s*password\s+[^\s#]+/gim,
    severity: "critical",
    description:
      "Plaintext password in .netrc. Move credentials to a secret manager and remove this file from the repo.",
  },
  {
    name: "Bearer Token in Header",
    needles: ["Bearer "],
    regex: /\bBearer\s+[A-Za-z0-9._\-+/=]{20,}/g,
    severity: "high",
    description:
      "Bearer token in source. Move to a request signer and avoid checking tokens in.",
  },
  {
    name: "Basic Auth in URL",
    needles: ["://"],
    regex: /\bhttps?:\/\/[A-Za-z0-9._~%-]+:[A-Za-z0-9._~%-]+@[^\s"'<>]+/g,
    severity: "high",
    description:
      "Basic-auth credentials in URL. Move to request headers and use environment variables.",
  },
  {
    name: "Generic API Key Assignment",
    needles: ["api_key", "apikey", "secret", "token", "password", "passwd", "pwd"],
    regex:
      /\b(?:api[_-]?key|apikey|secret|token|password|passwd|pwd)\b\s*[:=]\s*["']([^"'\s]{12,})["']/gi,
    severity: "high",
    description:
      "Hardcoded credential-like assignment. Review and move to environment variables.",
  },
  {
    name: "JWT Secret Assignment",
    needles: ["JWT_SECRET", "jwt-secret", "jwt_secret"],
    regex: /\bJWT[_-]?SECRET\b\s*[:=]\s*["']([^"'\s]{6,})["']/gi,
    severity: "high",
    description: "JWT secret committed to source. Move to a secret manager.",
  },
  {
    name: "Terraform Variable with secret name",
    needles: ["secret", "password", "token"],
    regex: /^\s*(?:api[_-]?key|secret|password|token|private[_-]?key)\s*=\s*["']([^"'\s]{12,})["']/gim,
    severity: "high",
    description:
      "Hardcoded value in a Terraform variable. Move to a tfvars file that is gitignored, or use a secret manager.",
  },

  // ---- gitleaks-derived rules (ported from gitleaks/config/gitleaks.toml) ----

  {
    name: "Anthropic Admin API Key",
    needles: ["sk-ant-admin01"],
    regex: /\bsk-ant-admin01-[A-Za-z0-9_\-]{93}AA(?:[`'"\s;]|$)/g,
    severity: "critical",
    description:
      "Looks like an Anthropic admin API key. Rotate immediately if real.",
  },
  {
    name: "Perplexity API Key",
    needles: ["pplx-"],
    regex: /\bpplx-[A-Za-z0-9]{48}\b/g,
    severity: "high",
    description: "Looks like a Perplexity AI API key. Revoke it if real.",
  },
  {
    name: "Notion API Token",
    needles: ["ntn_"],
    regex: /\bntn_\d{11}[A-Za-z0-9]{32}[A-Za-z0-9]{3}(?:[`'"\s;]|$)/g,
    severity: "high",
    description: "Looks like a Notion API token. Revoke it if real.",
  },
  {
    name: "HuggingFace Org Token",
    needles: ["api_org_"],
    regex: /\bapi_org_[A-Za-z0-9]{34}(?:[`'"\s;]|$)/g,
    severity: "high",
    description: "Looks like a HuggingFace organization token. Revoke it if real.",
  },
  {
    name: "AWS Bedrock Long-Lived API Key",
    needles: ["ABSK"],
    regex: /\bABSK[A-Za-z0-9+/]{109,269}={0,2}(?:[`'"\s;]|$)/g,
    severity: "critical",
    description: "Looks like an AWS Bedrock long-lived API key. Rotate it if real.",
  },
  {
    name: "Azure AD Client Secret",
    needles: ["Q~"],
    regex: /(?:^|[`'"\s>=:(,])([A-Za-z0-9_~.]{3}\dQ~[A-Za-z0-9_~.-]{31,34})(?:$|[`'"\s<),])/g,
    severity: "high",
    description: "Looks like an Azure AD client secret. Rotate it if real.",
  },
  {
    name: "Alibaba AccessKey ID",
    needles: ["LTAI"],
    regex: /\bLTAI[A-Za-z0-9]{20}(?:[`'"\s;]|$)/g,
    severity: "critical",
    description: "Looks like an Alibaba Cloud access key ID. Rotate it if real.",
  },
  {
    name: "Heroku API Key v2",
    needles: ["HRKU-AA"],
    regex: /\bHRKU-AA[A-Za-z0-9_-]{58}(?:[`'"\s;]|$)/g,
    severity: "high",
    description: "Looks like a Heroku API key. Revoke it if real.",
  },
  {
    name: "Pulumi API Token",
    needles: ["pul-"],
    regex: /\bpul-[a-f0-9]{40}(?:[`'"\s;]|$)/g,
    severity: "high",
    description: "Looks like a Pulumi API token. Revoke it if real.",
  },
  {
    name: "Fly.io Access Token",
    needles: ["fo1_", "fm1", "fm2_"],
    regex: /\b(?:fo1_[\w-]{43}|fm1[ar]_[A-Za-z0-9+/]{100,}={0,3}|fm2_[A-Za-z0-9+/]{100,}={0,3})(?:[`'"\s;]|$)/g,
    severity: "high",
    description: "Looks like a Fly.io access token. Revoke it if real.",
  },
  {
    name: "New Relic User API Key",
    needles: ["NRAK-"],
    regex: /\bNRAK-[a-z0-9]{27}\b/gi,
    severity: "high",
    description: "Looks like a New Relic user API key. Revoke it if real.",
  },
  {
    name: "New Relic Insert Key",
    needles: ["NRII-"],
    regex: /\bNRII-[a-z0-9-]{32}\b/gi,
    severity: "medium",
    description: "Looks like a New Relic data insert key. Rotate it if real.",
  },
  {
    name: "Dynatrace API Token",
    needles: ["dt0c01."],
    regex: /dt0c01\.[A-Za-z0-9]{24}\.[a-z0-9]{64}/g,
    severity: "high",
    description: "Looks like a Dynatrace API token. Revoke it if real.",
  },
  {
    name: "Grafana Cloud API Token",
    needles: ["glc_"],
    regex: /\bglc_[A-Za-z0-9+/]{32,400}={0,3}\b/gi,
    severity: "high",
    description: "Looks like a Grafana Cloud API token. Revoke it if real.",
  },
  {
    name: "Databricks API Token",
    needles: ["dapi"],
    regex: /\bdapi[a-f0-9]{32}(?:-\d)?(?:[`'"\s;]|$)/g,
    severity: "critical",
    description: "Looks like a Databricks personal access token. Revoke it if real.",
  },
  {
    name: "HashiCorp Vault Service Token",
    needles: ["hvs.", "s."],
    regex: /\b(?:hvs\.[\w-]{90,120}|s\.[A-Za-z0-9]{24})(?:[`'"\s;]|$)/g,
    severity: "critical",
    description:
      "Looks like a HashiCorp Vault service or static token. Revoke it if real.",
  },
  {
    name: "HashiCorp Vault Batch Token",
    needles: ["hvb."],
    regex: /\bhvb\.[\w-]{138,300}(?:[`'"\s;]|$)/g,
    severity: "critical",
    description: "Looks like a HashiCorp Vault batch token. Revoke it if real.",
  },
  {
    name: "HashiCorp Terraform Cloud API Token",
    needles: ["atlasv1"],
    regex: /[a-z0-9]{14}\.atlasv1\.[a-z0-9\-_=]{60,70}/gi,
    severity: "high",
    description:
      "Looks like a Terraform Cloud API token (atlasv1). Revoke it if real.",
  },
  {
    name: "EasyPost API Token",
    needles: ["EZAK"],
    regex: /\bEZAK[A-Za-z0-9]{54}\b/g,
    severity: "high",
    description: "Looks like an EasyPost API token. Revoke it if real.",
  },
  {
    name: "ReadMe API Token",
    needles: ["rdme_"],
    regex: /\brdme_[a-z0-9]{70}(?:[`'"\s;]|$)/g,
    severity: "high",
    description: "Looks like a ReadMe.io API token. Revoke it if real.",
  },
  {
    name: "Prefect API Token",
    needles: ["pnu_"],
    regex: /\bpnu_[A-Za-z0-9]{36}(?:[`'"\s;]|$)/g,
    severity: "high",
    description: "Looks like a Prefect API token. Revoke it if real.",
  },
  {
    name: "Sourcegraph Access Token",
    needles: ["sgp_"],
    regex: /\b(?:sgp_(?:[a-fA-F0-9]{16}|local)_[a-fA-F0-9]{40}|sgp_[a-fA-F0-9]{40})\b/g,
    severity: "high",
    description: "Looks like a Sourcegraph access token. Revoke it if real.",
  },
  {
    name: "Slack Webhook URL",
    needles: ["hooks.slack.com"],
    regex: /(?:https?:\/\/)?hooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9+/]{43,56}/g,
    severity: "high",
    description:
      "Slack incoming webhook URL in source. Delete the webhook and create a new one if real.",
  },
  {
    name: "Microsoft Teams Webhook URL",
    needles: ["webhook.office.com", "webhookb2"],
    regex: /https:\/\/[a-z0-9]+\.webhook\.office\.com\/webhookb2\/[a-z0-9]{8}-(?:[a-z0-9]{4}-){3}[a-z0-9]{12}@[a-z0-9]{8}-(?:[a-z0-9]{4}-){3}[a-z0-9]{12}\/IncomingWebhook\/[a-z0-9]{32}\/[a-z0-9]{8}-(?:[a-z0-9]{4}-){3}[a-z0-9]{12}/g,
    severity: "high",
    description:
      "Microsoft Teams incoming webhook URL. Regenerate the webhook if real.",
  },
  {
    name: "Curl Authorization Header",
    needles: ["curl", "Authorization:", "Bearer", "X-Api-Key"],
    regex: /\bcurl\b[\s\S]{0,300}?(?:-H|--header)\b[\s\S]{0,10}?["'](?:Authorization:\s*(?:Basic|Bearer|Token)\s+[A-Za-z0-9._~+/=@-]{8,}|X-[A-Za-z]+-?(?:Api-?)?Key:\s*[A-Za-z0-9._~+/=@-]{8,})["']/i,
    severity: "high",
    description:
      "Authorization or API-key header in a curl command. Move credentials to environment variables or a request signer.",
  },
  {
    name: "Curl Basic Auth User",
    needles: ["curl"],
    regex: /\bcurl\b[\s\S]{0,200}?(?:-u|--user)\b[\s\S]{0,5}?["'](?:[^:"\s]+:[^"\s]+|[^"'\s]+:[^"'\s]+)["']/i,
    severity: "high",
    description:
      "Basic-auth user:pass in a curl command. Move credentials to environment variables or a .netrc file.",
  },
  {
    name: "HashiCorp Terraform Password",
    needles: ["password", "administrator_login_password"],
    regex: /\b(?:administrator_login_password|password)\b[\s'"=]{0,5}["'][A-Za-z0-9=_\-]{8,}["']/gi,
    severity: "high",
    description:
      "Hardcoded password in a Terraform (.tf/.hcl) file. Use a tfvars file that is gitignored, or fetch from a secret manager.",
  },
];

export const SECRET_NEEDLES: string[] = (() => {
  const set = new Set<string>();
  for (const p of SECRET_PATTERNS) {
    for (const n of p.needles) set.add(n);
  }
  return [...set];
})();

export function fileContainsAnyNeedle(content: string): boolean {
  for (const n of SECRET_NEEDLES) {
    if (content.indexOf(n) !== -1) return true;
  }
  return false;
}

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
  "null",
  "nil",
  "none",
  "undefined",
  "true",
  "false",
]);

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^<[a-z][a-z0-9_.\-]{1,30}>$/i,
  /^\[[a-z][a-z0-9_.\-]{1,30}\]$/i,
  /^\{[a-z][a-z0-9_.\-]{1,30}\}$/i,
  /^(?:your|my|the|some|insert|replace|enter)[-_][a-z][a-z0-9_.\-]{1,30}$/i,
  /^[a-z][a-z0-9_.\-]{1,30}[-_](?:here|placeholder|example|change|todo|fixme|key|token|password|secret)$/i,
  /^(?:x{3,}|\*{3,}|\.{3,}|-{3,})$/i,
  /^\$\{[a-z][a-z0-9_.\-]{0,30}\}$/i,
  /^process\.env\.[a-z][a-z0-9_]{0,30}$/i,
  /^env\.[a-z][a-z0-9_]{0,30}$/i,
  /^%[a-z][a-z0-9_]{0,30}%$/i,
];

export function isLikelyPlaceholder(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  const lower = v.toLowerCase();
  if (PLACEHOLDER_VALUES.has(lower)) return true;
  if (v.length < 8) return true;
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(v)) return true;
  }
  return false;
}

const COMMENT_PREFIXES_BY_EXT: Record<string, string[]> = {
  "default": ["#", "//", "/*", "*", "<!--"],
  "ts": ["//", "/*", "*"],
  "tsx": ["//", "/*", "*"],
  "js": ["//", "/*", "*"],
  "jsx": ["//", "/*", "*"],
  "mjs": ["//", "/*", "*"],
  "cjs": ["//", "/*", "*"],
  "java": ["//", "/*", "*"],
  "kt": ["//", "/*", "*"],
  "swift": ["//", "/*", "*"],
  "go": ["//", "/*", "*"],
  "rs": ["//", "/*", "*"],
  "scala": ["//", "/*", "*"],
  "clj": [";;", ";", "#"],
  "dart": ["//", "/*", "*"],
  "php": ["//", "/*", "*", "#"],
  "sh": ["#"],
  "bash": ["#"],
  "zsh": ["#"],
  "fish": ["#"],
  "ps1": ["#"],
  "py": ["#"],
  "rb": ["#"],
  "lua": ["--"],
  "yml": ["#"],
  "yaml": ["#"],
  "toml": ["#"],
  "ini": [";", "#"],
  "cfg": [";", "#"],
  "conf": [";", "#"],
  "config": [";", "#"],
  "env": ["#"],
  "npmrc": ["#", ";"],
  "pypirc": ["#"],
  "netrc": ["#"],
  "tf": ["#", "//"],
  "tfvars": ["#", "//"],
  "properties": ["#", "!"],
  "xml": ["<!--"],
  "html": ["<!--"],
  "htm": ["<!--"],
  "md": ["<!--"],
  "json": [],
  "pem": [],
  "key": [],
  "crt": [],
};

export function isCommentedLine(line: string, ext: string = "default"): boolean {
  const t = line.trimStart();
  if (!t) return false;
  const prefixes =
    COMMENT_PREFIXES_BY_EXT[ext.toLowerCase()] ??
    COMMENT_PREFIXES_BY_EXT["default"];
  for (const p of prefixes) {
    if (t.startsWith(p)) return true;
  }
  return false;
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
