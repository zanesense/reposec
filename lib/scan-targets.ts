export const SECRET_SCAN_MAX_FILE_BYTES = 1_500_000;

export const SECRET_SCAN_SKIP_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock",
  "Gemfile.lock",
  "Cargo.lock",
  "poetry.lock",
  "Pipfile.lock",
  "LICENSE",
  "SECURITY.md",
  "README.md",
  "CHANGELOG.md",
  "CODEOWNERS",
]);

export const SECRET_SCAN_SKIP_PATH_TOKENS = [
  "node_modules/",
  "vendor/",
  "dist/",
  "build/",
  ".next/",
  "out/",
  "coverage/",
  "target/",
  "bower_components/",
  "jspm_packages/",
  ".gradle/",
  "Pods/",
  ".terraform/",
  ".venv/",
  "venv/",
  "__pycache__/",
  ".git/",
];

export const SECRET_SCAN_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".json5",
  ".map",
  ".yml",
  ".yaml",
  ".env",
  ".py",
  ".rb",
  ".go",
  ".java",
  ".kt",
  ".swift",
  ".php",
  ".sh",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".config",
  ".pem",
  ".key",
  ".crt",
  ".npmrc",
  ".pypirc",
  ".netrc",
  ".tf",
  ".tfvars",
  ".hcl",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".dart",
  ".lua",
  ".rs",
  ".scala",
  ".clj",
  ".ex",
  ".exs",
  ".xml",
  ".properties",
  ".htaccess",
  ".sql",
  ".graphql",
  ".gql",
];

export const SECRET_SCAN_FILENAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  ".npmrc",
  ".pypirc",
  ".netrc",
  ".htpasswd",
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
]);

export function isLikelySecretScanPath(path: string, size?: number): boolean {
  if (typeof size === "number" && size > SECRET_SCAN_MAX_FILE_BYTES) return false;

  const normalized = path.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  const base = normalized.split("/").pop() ?? normalized;

  if (SECRET_SCAN_SKIP_FILES.has(normalized) || SECRET_SCAN_SKIP_FILES.has(base)) {
    return false;
  }
  for (const token of SECRET_SCAN_SKIP_PATH_TOKENS) {
    if (lower.includes(token.toLowerCase())) return false;
  }

  if (lower.includes("/test/") || lower.includes("/tests/")) return false;
  if (lower.includes("__tests__/") || lower.includes("__mocks__/")) return false;
  if (lower.includes("__snapshots__/") || lower.includes("__fixtures__/")) {
    return false;
  }
  if (lower.includes("fixtures/") || lower.includes("snapshots/")) return false;

  const isEnvLike = base.startsWith(".env") || SECRET_SCAN_FILENAMES.has(base);
  const hasKnownExt = SECRET_SCAN_EXTENSIONS.some((ext) => lower.endsWith(ext));
  return isEnvLike || hasKnownExt;
}

export function secretScanPriority(path: string): number {
  const lower = path.toLowerCase();
  const base = path.replace(/\\/g, "/").split("/").pop() ?? path;
  if (base === ".env" || base === ".env.local") return 100;
  if (base.startsWith(".env")) return 90;
  if (SECRET_SCAN_FILENAMES.has(base)) return 80;
  if (lower.endsWith(".json") || lower.endsWith(".yml") || lower.endsWith(".yaml")) {
    return 40;
  }
  if (
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".py")
  ) {
    return 30;
  }
  return 20;
}
