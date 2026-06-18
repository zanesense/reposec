import { maskSecret } from "./secrets.ts";
import { fingerprintSecret } from "./fingerprint.ts";
import { applyRepoBaseline } from "./baseline.ts";
import {
  isLikelySecretScanPath,
  secretScanPriority,
} from "./scan-targets.ts";
import type {
  CategoryBreakdown,
  CheckResult,
  CheckStatus,
  FileGroup,
  Finding,
  FindingCategory,
  FindingConfidence,
  RepoData,
  RepoFile,
  ScanSummary,
  Severity,
} from "./types.ts";
import {
  fileContainsAnyNeedle,
  isCommentedLine,
  isLikelyPlaceholder,
  SECRET_PATTERNS,
  SEVERITY_RANK,
  SEVERITY_WEIGHT,
} from "./rules.ts";

interface ScanContext {
  repo: RepoData;
  findings: Finding[];
  checks: CheckResult[];
  filesChecked: Set<string>;
  filesMissing: string[];
  secretCandidates: SecretCandidate[];
  collectSecretCandidates: boolean;
}

export interface SecretCandidate {
  findingId: string;
  patternName: string;
  value: string;
}

function findFile(files: RepoFile[], path: string): RepoFile | undefined {
  return files.find((f) => f.path === path);
}

function getLines(content: string): string[] {
  return content.split(/\r?\n/);
}

function makeFinding(
  id: string,
  title: string,
  description: string,
  severity: Severity,
  category: FindingCategory,
  fix: string,
  extras: Partial<Finding> = {},
): Finding {
  return {
    id,
    title,
    description,
    severity,
    category,
    fix,
    ...extras,
  };
}

function confidenceForSecretPattern(name: string): FindingConfidence {
  const lower = name.toLowerCase();
  if (lower.includes("informational") || lower.includes("public key")) {
    return "low";
  }
  if (
    lower.includes("generic") ||
    lower.includes("terraform variable") ||
    lower.includes("jwt secret assignment")
  ) {
    return "medium";
  }
  return "high";
}

function addCheck(
  ctx: ScanContext,
  id: string,
  category: FindingCategory,
  title: string,
  status: CheckStatus,
  message: string,
  extras: { file?: string; line?: number } = {},
): void {
  ctx.checks.push({ id, category, title, status, message, ...extras });
}

function recordCheck(
  ctx: ScanContext,
  id: string,
  category: FindingCategory,
  title: string,
  file: string | undefined,
  findings: Finding[],
  passMessage: string,
): void {
  for (const f of findings) ctx.findings.push(f);
  if (findings.length === 0) {
    addCheck(ctx, id, category, title, "pass", passMessage, { file });
    return;
  }
  let highestRank = 0;
  let highestSev: Severity = "info";
  for (const f of findings) {
    const r = SEVERITY_RANK[f.severity];
    if (r > highestRank) {
      highestRank = r;
      highestSev = f.severity;
    }
  }
  const status: CheckStatus =
    highestSev === "info" ? "info" : highestSev === "low" ? "warn" : "fail";
  addCheck(ctx, id, category, title, status, findings[0].description, { file });
}

function maskLine(line: string): string {
  return line.replace(
    /(?:api[_-]?key|apikey|secret|token|password|passwd|pwd)\s*[:=]\s*["']?([^"'\s]+)/gi,
    (_m, val: string) => {
      if (isLikelyPlaceholder(val)) return val;
      return maskSecret(val);
    },
  );
}

function isInsideString(line: string, matchIndex: number): boolean {
  const before = line.slice(0, matchIndex);
  const singleQuotes = (before.match(/'/g) ?? []).length;
  const doubleQuotes = (before.match(/"/g) ?? []).length;
  const backticks = (before.match(/`/g) ?? []).length;
  return singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1;
}

function isInsideRegexLiteral(line: string, matchIndex: number): boolean {
  const before = line.slice(0, matchIndex);
  const after = line.slice(matchIndex);
  return /\/[^/\n\\]*(?:\\.[^/\n\\]*)*$/.test(before) && /^[^/\n\\]*(?:\\.[^/\n\\]*)*\//.test(after);
}

function isTestFile(path: string): boolean {
  return (
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(path) ||
    /(^|\/)__tests__\//.test(path) ||
    /(^|\/)__mocks__\//.test(path) ||
    /(^|\/)__fixtures__\//.test(path) ||
    /(^|\/)test\//.test(path) ||
    /(^|\/)tests\//.test(path) ||
    /(^|\/)fixtures?\//.test(path)
  );
}

function readGitignorePatterns(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

function gitignoreCoversAny(
  content: string,
  matchers: Array<(pattern: string) => boolean>,
): boolean {
  for (const raw of readGitignorePatterns(content)) {
    let pattern = raw;
    if (pattern.startsWith("!")) continue;
    pattern = pattern.replace(/^(?:\/?\*\*\/)+/, "").replace(/^\//, "");
    if (pattern.endsWith("/")) pattern = pattern.slice(0, -1);
    for (const matcher of matchers) {
      if (matcher(pattern)) return true;
    }
  }
  return false;
}

const envMatchers: Array<(p: string) => boolean> = [
  (p) => p === ".env",
  (p) => p === "**/.env",
  (p) => p === ".env*",
  (p) => p === "**/.env*",
  (p) => p.startsWith(".env."),
  (p) => p.startsWith("**/.env."),
  (p) => p.startsWith(".env/"),
];

const buildOutputMatchers: Array<(p: string) => boolean> = [
  (p) => p === "dist" || p.startsWith("dist/"),
  (p) => p === "build" || p.startsWith("build/"),
  (p) => p === "out" || p.startsWith("out/"),
  (p) => p === ".next" || p.startsWith(".next/"),
  (p) => p === ".nuxt" || p.startsWith(".nuxt/"),
  (p) => p === "*.output" || p.startsWith("*.output/"),
  (p) => p === "coverage" || p.startsWith("coverage/"),
];

const nodeModulesMatchers: Array<(p: string) => boolean> = [
  (p) => p === "node_modules",
  (p) => p === "node_modules/",
  (p) => p === "**/node_modules",
  (p) => p === "**/node_modules/**",
  (p) => p.startsWith("node_modules/"),
  (p) => p.startsWith("**/node_modules/"),
];

function hasHeadingContaining(
  content: string,
  keywords: string[],
): { found: boolean; matchedHeading?: string; keyword?: string } {
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const heading = m[2].trim();
    const lowered = heading.toLowerCase();
    for (const kw of keywords) {
      if (lowered.includes(kw.toLowerCase())) {
        return { found: true, matchedHeading: heading, keyword: kw };
      }
    }
  }
  return { found: false };
}

function missingFile(ctx: ScanContext, path: string): void {
  ctx.filesMissing.push(path);
  ctx.filesChecked.add(path);
}

function presentFile(ctx: ScanContext, path: string): void {
  ctx.filesChecked.add(path);
}

function checkEnvironment(ctx: ScanContext): void {
  const envFiles = [".env", ".env.local", ".env.production", ".env.development"];
  const exposed: Finding[] = [];
  for (const env of envFiles) {
    const f = findFile(ctx.repo.files, env);
    if (!f) {
      missingFile(ctx, env);
      continue;
    }
    presentFile(ctx, env);
    const lines = getLines(f.content);
    const sample = lines
      .filter((l) => l.trim() && !isCommentedLine(l, "env"))
      .slice(0, 3)
      .map(maskLine)
      .join(" | ");
    exposed.push(
      makeFinding(
        `env-exposed-${env}`,
        `Exposed environment file: ${env}`,
        `A ${env} file is committed to the repository. This file likely contains secrets, tokens, or database credentials. Remove it from the repo and rotate any real values.`,
        "critical",
        "environment",
        `Delete ${env} from the repository, add it to .gitignore, purge it from git history (git filter-repo), and rotate every value that was inside.`,
        {
          file: env,
          evidence: sample || "non-empty file present",
          fixPrompt: `Remove ${env} from the repository, ensure .gitignore contains the right patterns, and rewrite the file with placeholder values.`,
        },
      ),
    );
  }

  recordCheck(
    ctx,
    "env-exposure",
    "environment",
    "No exposed .env files in the repository",
    undefined,
    exposed,
    "No .env files are committed to the repository.",
  );

  const envExample = findFile(ctx.repo.files, ".env.example");
  if (!envExample) {
    missingFile(ctx, ".env.example");
    addCheck(
      ctx,
      "env-example",
      "environment",
      ".env.example present",
      "fail",
      "No .env.example file is present. New contributors cannot tell which environment variables to set.",
      { file: ".env.example" },
    );
    ctx.findings.push(
      makeFinding(
        "env-example-missing",
        "Missing .env.example",
        "No .env.example file is present. New contributors cannot tell which environment variables to set.",
        "medium",
        "environment",
        "Add an .env.example file with placeholder values (KEY=value) for every variable the app reads at runtime.",
        {
          fixPrompt:
            "Create an .env.example file with placeholder values for every environment variable used by the app. Do not put real secrets in it.",
        },
      ),
    );
  } else {
    presentFile(ctx, ".env.example");
    addCheck(
      ctx,
      "env-example",
      "environment",
      ".env.example present",
      "pass",
      ".env.example is present, contributors can see which keys to set.",
      { file: ".env.example" },
    );
  }
}

function checkGitignore(ctx: ScanContext): void {
  const gi = findFile(ctx.repo.files, ".gitignore");
  if (!gi) {
    missingFile(ctx, ".gitignore");
    addCheck(
      ctx,
      "gitignore",
      "environment",
      ".gitignore present",
      "fail",
      "No .gitignore file is present. Build artifacts, dependencies, and local files may be committed by accident.",
      { file: ".gitignore" },
    );
    ctx.findings.push(
      makeFinding(
        "gitignore-missing",
        "Missing .gitignore",
        "No .gitignore file is present. Build artifacts, dependencies, and local files may be committed by accident.",
        "high",
        "environment",
        "Add a .gitignore suited to the project stack (Node, Python, Go, etc.) and include .env, node_modules, dist, build, and IDE folders.",
      ),
    );
    return;
  }
  presentFile(ctx, ".gitignore");

  const checks: Array<{
    id: string;
    title: string;
    severity: Severity;
    fix: string;
    covered: boolean;
  }> = [
    {
      id: "gitignore-env",
      title: ".gitignore covers .env files",
      severity: "high",
      fix: "Add an entry like `.env`, `.env*`, or `.env.*` to .gitignore (and `!.env.example` if you ship a template).",
      covered: gitignoreCoversAny(gi.content, envMatchers),
    },
    {
      id: "gitignore-node-modules",
      title: ".gitignore ignores node_modules",
      severity: "low",
      fix: "Add `node_modules/` to .gitignore so dependencies are not committed.",
      covered: gitignoreCoversAny(gi.content, nodeModulesMatchers),
    },
    {
      id: "gitignore-build",
      title: ".gitignore ignores build output",
      severity: "low",
      fix: "Add entries for your build output (`dist/`, `build/`, `out/`, `.next/`, `coverage/`, etc.) to .gitignore.",
      covered: gitignoreCoversAny(gi.content, buildOutputMatchers),
    },
  ];

  for (const check of checks) {
    if (!check.covered) {
      addCheck(
        ctx,
        check.id,
        "environment",
        check.title,
        "fail",
        "Your .gitignore is missing an important entry. This can leak secrets or bloat the repository.",
        { file: ".gitignore" },
      );
      ctx.findings.push(
        makeFinding(
          check.id,
          check.title
            .replace(" ignores", " should ignore")
            .replace(" covers", " should cover"),
          "Your .gitignore is missing an important entry. This can leak secrets or bloat the repository.",
          check.severity,
          "environment",
          check.fix,
          { file: ".gitignore" },
        ),
      );
    } else {
      addCheck(
        ctx,
        check.id,
        "environment",
        check.title,
        "pass",
        "Pattern is present in .gitignore.",
        { file: ".gitignore" },
      );
    }
  }
}

function checkDocumentation(ctx: ScanContext): void {
  const readme = findFile(ctx.repo.files, "README.md");
  if (!readme) {
    missingFile(ctx, "README.md");
    addCheck(
      ctx,
      "readme",
      "documentation",
      "README.md present",
      "fail",
      "There is no README. New users and contributors will not know how to install, run, or contribute.",
      { file: "README.md" },
    );
    ctx.findings.push(
      makeFinding(
        "readme-missing",
        "Missing README.md",
        "There is no README. New users and contributors will not know how to install, run, or contribute.",
        "medium",
        "documentation",
        "Add a README.md with a project description, install steps, usage, and a security section.",
      ),
    );
  } else {
    presentFile(ctx, "README.md");
    addCheck(
      ctx,
      "readme",
      "documentation",
      "README.md present",
      "pass",
      "README.md is present in the repository root.",
      { file: "README.md" },
    );

    const sections: Array<{
      keywords: string[];
      id: string;
      title: string;
      fix: string;
      severity: Severity;
    }> = [
      {
        keywords: [
          "install",
          "installation",
          "setup",
          "getting started",
          "quickstart",
          "quick start",
          "how to start",
          "how to use",
          "build",
          "running",
          "run locally",
          "local development",
          "development",
        ],
        id: "readme-setup",
        title: "README documents setup steps",
        fix: "Add an Install / Getting Started section with the exact commands a new user has to run.",
        severity: "low",
      },
      {
        keywords: [
          "environment variable",
          "env var",
          "env vars",
          ".env",
          "configuration",
          "config",
          "settings",
        ],
        id: "readme-env",
        title: "README documents environment variables",
        fix: "Add a section listing every environment variable the app reads, with a short description for each.",
        severity: "low",
      },
      {
        keywords: [
          "security",
          "security policy",
          "reporting",
          "responsible disclosure",
          "vulnerability",
        ],
        id: "readme-security",
        title: "README has a security section",
        fix: "Add a Security section that links to SECURITY.md and explains how to report vulnerabilities.",
        severity: "low",
      },
    ];

    for (const section of sections) {
      const result = hasHeadingContaining(readme.content, section.keywords);
      if (!result.found) {
        addCheck(
          ctx,
          section.id,
          "documentation",
          section.title,
          section.severity === "low" ? "warn" : "fail",
          "Readers will not know how to set up the project or report security issues without this section.",
          { file: "README.md" },
        );
        ctx.findings.push(
          makeFinding(
            section.id,
            section.title.replace(" documents", " missing").replace(" has a security", " has no security"),
            "Readers will not know how to set up the project or report security issues without this section.",
            section.severity,
            "documentation",
            section.fix,
            { file: "README.md" },
          ),
        );
      } else {
        addCheck(
          ctx,
          section.id,
          "documentation",
          section.title,
          "pass",
          `Found a "${result.matchedHeading}" heading in the README.`,
          { file: "README.md" },
        );
      }
    }
  }

  if (!findFile(ctx.repo.files, "SECURITY.md")) {
    missingFile(ctx, "SECURITY.md");
    addCheck(
      ctx,
      "security-md",
      "documentation",
      "SECURITY.md present",
      "fail",
      "There is no SECURITY.md. Security researchers have no clear way to report vulnerabilities to you.",
      { file: "SECURITY.md" },
    );
    ctx.findings.push(
      makeFinding(
        "security-md-missing",
        "Missing SECURITY.md",
        "There is no SECURITY.md. Security researchers have no clear way to report vulnerabilities to you.",
        "medium",
        "documentation",
        "Add a SECURITY.md with supported versions, a contact method (email or GitHub Security Advisories), and a response timeline.",
        {
          fixPrompt:
            "Create a SECURITY.md file following GitHub's community health standards. Include supported versions, how to report a vulnerability, and a reasonable response timeline.",
        },
      ),
    );
  } else {
    presentFile(ctx, "SECURITY.md");
    addCheck(
      ctx,
      "security-md",
      "documentation",
      "SECURITY.md present",
      "pass",
      "SECURITY.md is present, vulnerability disclosure is documented.",
      { file: "SECURITY.md" },
    );
  }

  if (!findFile(ctx.repo.files, "LICENSE")) {
    missingFile(ctx, "LICENSE");
    addCheck(
      ctx,
      "license",
      "documentation",
      "LICENSE present",
      "warn",
      "No LICENSE file is present. Users and contributors cannot tell what they are allowed to do with the code.",
      { file: "LICENSE" },
    );
    ctx.findings.push(
      makeFinding(
        "license-missing",
        "Missing LICENSE",
        "No LICENSE file is present. Users and contributors cannot tell what they are allowed to do with the code.",
        "low",
        "documentation",
        "Add a LICENSE file (MIT, Apache-2.0, etc.) and reference it from the README.",
      ),
    );
  } else {
    presentFile(ctx, "LICENSE");
    addCheck(
      ctx,
      "license",
      "documentation",
      "LICENSE present",
      "pass",
      "LICENSE file is present in the repository root.",
      { file: "LICENSE" },
    );
  }
}

function checkPackage(ctx: ScanContext): void {
  const pkg = findFile(ctx.repo.files, "package.json");
  if (!pkg) {
    missingFile(ctx, "package.json");
    addCheck(
      ctx,
      "package-json",
      "package",
      "package.json present",
      "skip",
      "No package.json was found, so Node-based checks were skipped.",
      { file: "package.json" },
    );
    return;
  }
  presentFile(ctx, "package.json");

  let parsed: {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    engines?: Record<string, string>;
    private?: boolean;
    repository?: unknown;
  } | null = null;
  try {
    parsed = JSON.parse(pkg.content);
  } catch {
    addCheck(
      ctx,
      "package-json",
      "package",
      "package.json present",
      "fail",
      "The package.json file could not be parsed. Many scanners and tools will fail on it.",
      { file: "package.json" },
    );
    ctx.findings.push(
      makeFinding(
        "package-json-invalid",
        "package.json is not valid JSON",
        "The package.json file could not be parsed. Many scanners and tools will fail on it.",
        "high",
        "package",
        "Fix the JSON syntax in package.json so it parses cleanly.",
        { file: "package.json" },
      ),
    );
    return;
  }

  addCheck(
    ctx,
    "package-json",
    "package",
    "package.json present",
    "pass",
    "package.json parses cleanly.",
    { file: "package.json" },
  );

  const scripts = parsed?.scripts ?? {};
  const required: Array<{
    name: string;
    id: string;
    severity: Severity;
    fix: string;
  }> = [
    {
      name: "test",
      id: "pkg-test",
      severity: "low",
      fix: "Add a `test` script so contributors and CI can run your test suite.",
    },
    {
      name: "lint",
      id: "pkg-lint",
      severity: "low",
      fix: "Add a `lint` script (eslint, biome, etc.) to catch issues before they ship.",
    },
    {
      name: "audit",
      id: "pkg-audit",
      severity: "low",
      fix: "Add an `audit` script that runs `npm audit --omit=dev` (or equivalent) for dependency safety.",
    },
    {
      name: "start",
      id: "pkg-start",
      severity: "info",
      fix: "Add a `start` script so users can run the app in production mode.",
    },
  ];

  for (const req of required) {
    if (!scripts[req.name]) {
      addCheck(
        ctx,
        req.id,
        "package",
        `package.json has a "${req.name}" script`,
        req.severity === "low" ? "warn" : "info",
        `The package.json has no "${req.name}" script. CI and contributors rely on standard script names.`,
        { file: "package.json" },
      );
      ctx.findings.push(
        makeFinding(
          req.id,
          `Missing package.json script: ${req.name}`,
          `The package.json has no "${req.name}" script. CI and contributors rely on standard script names.`,
          req.severity,
          "package",
          req.fix,
          { file: "package.json" },
        ),
      );
    } else {
      addCheck(
        ctx,
        req.id,
        "package",
        `package.json has a "${req.name}" script`,
        "pass",
        `Script "${req.name}" is defined.`,
        { file: "package.json" },
      );
    }
  }
}

function checkGithub(ctx: ScanContext): void {
  if (!ctx.repo.hasWorkflows) {
    missingFile(ctx, ".github/workflows");
    addCheck(
      ctx,
      "gh-workflows",
      "github",
      "GitHub Actions workflows present",
      "warn",
      "There are no files under .github/workflows. CI is either missing or not committed.",
      { file: ".github/workflows" },
    );
    ctx.findings.push(
      makeFinding(
        "gh-no-workflows",
        "No GitHub Actions workflows",
        "There are no files under .github/workflows. CI is either missing or not committed.",
        "low",
        "github",
        "Add at least a basic CI workflow that installs dependencies, runs lint and tests, and runs an audit step.",
      ),
    );
  } else {
    presentFile(ctx, ".github/workflows");
    addCheck(
      ctx,
      "gh-workflows",
      "github",
      "GitHub Actions workflows present",
      "pass",
      `${ctx.repo.workflows.length} workflow file(s) found.`,
      { file: ".github/workflows" },
    );
  }

  if (!ctx.repo.hasDependabot) {
    missingFile(ctx, ".github/dependabot.yml");
    addCheck(
      ctx,
      "gh-dependabot",
      "github",
      "Dependabot configured",
      "fail",
      "There is no .github/dependabot.yml. Vulnerable dependencies will not get automatic pull requests.",
      { file: ".github/dependabot.yml" },
    );
    ctx.findings.push(
      makeFinding(
        "gh-no-dependabot",
        "Dependabot is not configured",
        "There is no .github/dependabot.yml. Vulnerable dependencies will not get automatic pull requests.",
        "medium",
        "github",
        "Add a .github/dependabot.yml with at least one ecosystem (npm, pip, etc.) and a sensible schedule.",
        {
          fixPrompt:
            "Add a .github/dependabot.yml that enables Dependabot for the package ecosystems used in this repo.",
        },
      ),
    );
  } else {
    presentFile(ctx, ".github/dependabot.yml");
    addCheck(
      ctx,
      "gh-dependabot",
      "github",
      "Dependabot configured",
      "pass",
      "Dependabot configuration is present.",
      { file: ".github/dependabot.yml" },
    );
  }
}

function checkDockerfile(ctx: ScanContext): void {
  if (!ctx.repo.hasDockerfile) {
    missingFile(ctx, "Dockerfile");
    addCheck(
      ctx,
      "dockerfile",
      "docker",
      "Dockerfile present",
      "info",
      "No Dockerfile is present. Container hygiene checks were skipped.",
      { file: "Dockerfile" },
    );
    return;
  }
  const dockerfile = findFile(
    ctx.repo.files,
    "Dockerfile",
  );
  if (!dockerfile) {
    const candidates = ctx.repo.files.filter((f) =>
      /^Dockerfile(\.[^/]+)?$/.test(f.path),
    );
    if (candidates.length === 0) return;
    candidates.forEach((c) => presentFile(ctx, c.path));
    return runDockerfileChecks(ctx, candidates[0]);
  }
  presentFile(ctx, "Dockerfile");
  runDockerfileChecks(ctx, dockerfile);
}

function runDockerfileChecks(ctx: ScanContext, dockerfile: RepoFile): void {
  const lines = getLines(dockerfile.content);
  const content = dockerfile.content;

  const hasUser = /(?:^|\n)\s*USER\s+\S+/i.test(content);
  if (!hasUser) {
    addCheck(
      ctx,
      "docker-user",
      "docker",
      "Dockerfile sets a non-root USER",
      "warn",
      "No USER directive was found. The container will run as root by default.",
      { file: dockerfile.path },
    );
    ctx.findings.push(
      makeFinding(
        "docker-user-missing",
        "Dockerfile is missing a USER directive",
        "No USER directive was found in the Dockerfile. The container will run as root by default, which violates least-privilege.",
        "medium",
        "docker",
        "Add a non-root user with `RUN adduser` and switch to it via `USER <name>` before the CMD/ENTRYPOINT.",
        { file: dockerfile.path },
      ),
    );
  } else {
    addCheck(
      ctx,
      "docker-user",
      "docker",
      "Dockerfile sets a non-root USER",
      "pass",
      "USER directive is set.",
      { file: dockerfile.path },
    );
  }

  const hasHealthcheck = /^\s*HEALTHCHECK\b/im.test(content);
  if (!hasHealthcheck) {
    addCheck(
      ctx,
      "docker-healthcheck",
      "docker",
      "Dockerfile defines a HEALTHCHECK",
      "info",
      "No HEALTHCHECK was found. Orchestrators cannot detect a dead container.",
      { file: dockerfile.path },
    );
  } else {
    addCheck(
      ctx,
      "docker-healthcheck",
      "docker",
      "Dockerfile defines a HEALTHCHECK",
      "pass",
      "HEALTHCHECK directive is set.",
      { file: dockerfile.path },
    );
  }

  const fromRegex = /^\s*FROM\s+([^\s]+).*$/gim;
  let m: RegExpExecArray | null;
  let latestUsed = false;
  while ((m = fromRegex.exec(content)) !== null) {
    const ref = m[1];
    if (!ref) continue;
    if (ref.endsWith(":latest") || !ref.includes(":")) latestUsed = true;
  }
  if (latestUsed) {
    addCheck(
      ctx,
      "docker-tag",
      "docker",
      "Dockerfile pins image versions",
      "warn",
      "At least one FROM line uses :latest or has no tag. Builds will not be reproducible.",
      { file: dockerfile.path },
    );
    ctx.findings.push(
      makeFinding(
        "docker-tag-latest",
        "Dockerfile uses :latest or untagged base image",
        "At least one FROM line uses :latest or has no tag. Builds will not be reproducible and security patches will not be deterministic.",
        "low",
        "docker",
        "Pin every FROM to a specific digest or version (e.g. `FROM node:20.11-alpine@sha256:...`).",
        { file: dockerfile.path },
      ),
    );
  } else {
    addCheck(
      ctx,
      "docker-tag",
      "docker",
      "Dockerfile pins image versions",
      "pass",
      "All FROM references include a tag or digest.",
      { file: dockerfile.path },
    );
  }

  const hasAdd = /^\s*ADD\s+https?:\/\//im.test(content);
  if (hasAdd) {
    addCheck(
      ctx,
      "docker-add",
      "docker",
      "Dockerfile avoids ADD with URLs",
      "info",
      "ADD with a URL was detected. Prefer RUN curl/wget with a checksum.",
      { file: dockerfile.path },
    );
    ctx.findings.push(
      makeFinding(
        "docker-add-url",
        "Dockerfile uses ADD with a remote URL",
        "ADD with a remote URL bypasses the layer cache and skips checksum verification. Use RUN curl/wget with a verified checksum instead.",
        "low",
        "docker",
        "Replace `ADD <url>` with `RUN curl -fsSL <url> | sha256sum -c -` or a pinned download step.",
        { file: dockerfile.path },
      ),
    );
  } else {
    addCheck(
      ctx,
      "docker-add",
      "docker",
      "Dockerfile avoids ADD with URLs",
      "pass",
      "No ADD with remote URLs.",
      { file: dockerfile.path },
    );
  }

  const hasSshExpose = /^\s*EXPOSE\s+(?:.*\s)?22\b/im.test(content);
  if (hasSshExpose) {
    addCheck(
      ctx,
      "docker-ssh",
      "docker",
      "Dockerfile does not expose SSH",
      "fail",
      "Port 22 is exposed in the Dockerfile. Containers should not run an SSH server.",
      { file: dockerfile.path },
    );
    ctx.findings.push(
      makeFinding(
        "docker-ssh-expose",
        "Dockerfile exposes SSH port 22",
        "EXPOSE 22 was found. Running an SSH server inside a container is almost never required and broadens the attack surface.",
        "high",
        "docker",
        "Remove the SSH server and EXPOSE 22. Use `docker exec` or orchestrator-level access instead.",
        { file: dockerfile.path },
      ),
    );
  } else {
    addCheck(
      ctx,
      "docker-ssh",
      "docker",
      "Dockerfile does not expose SSH",
      "pass",
      "No SSH port exposure detected.",
      { file: dockerfile.path },
    );
  }

  void lines;
}

function checkCommunity(ctx: ScanContext): void {
  if (!ctx.repo.hasIssueTemplate) {
    missingFile(ctx, ".github/ISSUE_TEMPLATE/");
    addCheck(
      ctx,
      "issue-template",
      "community",
      "Issue templates present",
      "info",
      "No files under .github/ISSUE_TEMPLATE/. New issues may lack structure.",
      { file: ".github/ISSUE_TEMPLATE/" },
    );
  } else {
    presentFile(ctx, ".github/ISSUE_TEMPLATE/");
    addCheck(
      ctx,
      "issue-template",
      "community",
      "Issue templates present",
      "pass",
      "Issue template directory is present.",
      { file: ".github/ISSUE_TEMPLATE/" },
    );
  }

  if (!ctx.repo.hasPullRequestTemplate) {
    missingFile(ctx, "PULL_REQUEST_TEMPLATE.md");
    addCheck(
      ctx,
      "pr-template",
      "community",
      "Pull request template present",
      "info",
      "No PULL_REQUEST_TEMPLATE.md. New PRs may lack context.",
      { file: "PULL_REQUEST_TEMPLATE.md" },
    );
  } else {
    presentFile(ctx, "PULL_REQUEST_TEMPLATE.md");
    addCheck(
      ctx,
      "pr-template",
      "community",
      "Pull request template present",
      "pass",
      "Pull request template is present.",
      { file: "PULL_REQUEST_TEMPLATE.md" },
    );
  }

  if (!ctx.repo.hasCodeowners) {
    missingFile(ctx, ".github/CODEOWNERS");
    addCheck(
      ctx,
      "codeowners",
      "community",
      "CODEOWNERS defined",
      "warn",
      "No CODEOWNERS file was found. Reviewers are not auto-assigned.",
      { file: ".github/CODEOWNERS" },
    );
    ctx.findings.push(
      makeFinding(
        "codeowners-missing",
        "Missing CODEOWNERS",
        "No CODEOWNERS file was found. Pull requests will not be auto-assigned to the right reviewers.",
        "low",
        "community",
        "Add a CODEOWNERS file under .github/ or the repository root, listing the teams that own key paths.",
      ),
    );
  } else {
    presentFile(ctx, ".github/CODEOWNERS");
    addCheck(
      ctx,
      "codeowners",
      "community",
      "CODEOWNERS defined",
      "pass",
      "CODEOWNERS is configured.",
      { file: ".github/CODEOWNERS" },
    );
  }

  if (!ctx.repo.hasCodeOfConduct) {
    missingFile(ctx, "CODE_OF_CONDUCT.md");
    addCheck(
      ctx,
      "code-of-conduct",
      "community",
      "Code of conduct present",
      "info",
      "No CODE_OF_CONDUCT.md. Contributor behavior expectations are not documented.",
      { file: "CODE_OF_CONDUCT.md" },
    );
  } else {
    presentFile(ctx, "CODE_OF_CONDUCT.md");
    addCheck(
      ctx,
      "code-of-conduct",
      "community",
      "Code of conduct present",
      "pass",
      "Code of conduct is documented.",
      { file: "CODE_OF_CONDUCT.md" },
    );
  }

  if (!ctx.repo.hasContributing) {
    missingFile(ctx, "CONTRIBUTING.md");
    addCheck(
      ctx,
      "contributing",
      "community",
      "CONTRIBUTING.md present",
      "info",
      "No CONTRIBUTING.md. New contributors will not know how to submit changes.",
      { file: "CONTRIBUTING.md" },
    );
  } else {
    presentFile(ctx, "CONTRIBUTING.md");
    addCheck(
      ctx,
      "contributing",
      "community",
      "CONTRIBUTING.md present",
      "pass",
      "CONTRIBUTING.md is present.",
      { file: "CONTRIBUTING.md" },
    );
  }

  if (!ctx.repo.hasChangelog) {
    missingFile(ctx, "CHANGELOG.md");
    addCheck(
      ctx,
      "changelog",
      "community",
      "Changelog or release notes present",
      "info",
      "No CHANGELOG.md or release notes. Users cannot see what changed between versions.",
      { file: "CHANGELOG.md" },
    );
  } else {
    presentFile(ctx, "CHANGELOG.md");
    addCheck(
      ctx,
      "changelog",
      "community",
      "Changelog or release notes present",
      "pass",
      "Changelog or release notes are present.",
      { file: "CHANGELOG.md" },
    );
  }
}

function checkWorkflowQuality(ctx: ScanContext): void {
  const workflowFiles = ctx.repo.files.filter((f) =>
    f.path.startsWith(".github/workflows/"),
  );
  if (workflowFiles.length === 0) {
    addCheck(
      ctx,
      "ci-quality",
      "ci",
      "CI workflow quality",
      "info",
      "No workflows to inspect (see GitHub Actions check above).",
    );
    return;
  }

  let anyOnPullRequest = false;
  let runsTests = false;
  let runsAudit = false;
  let hasWriteAll = false;
  const TEST_PATTERN =
    /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b|\bcargo\s+test\b|\bgo\s+test\b|\bpytest\b|\bmake\s+test\b|\bgradle\s+test\b|\bmvn\s+test\b|\bdotnet\s+test\b|\bbun\s+test\b|\bvitest\s+run\b|\bjest\b/i;
  const AUDIT_PATTERN =
    /\bnpm\s+audit\b|\bpnpm\s+audit\b|\byarn\s+audit\b|\bpip-audit\b|\bsafety\s+(?:check|scan)\b|\bcargo\s+audit\b|\bdotnet\s+list\s+package\s+--vulnerable\b|\btrivy\b|\bsnyk\b|\bdependabot\b|\bgovulncheck\b|\bcomposer\s+audit\b/i;
  for (const wf of workflowFiles) {
    const lower = wf.content.toLowerCase();
    if (lower.includes("pull_request")) anyOnPullRequest = true;
    if (TEST_PATTERN.test(wf.content)) runsTests = true;
    if (AUDIT_PATTERN.test(wf.content)) runsAudit = true;
    if (/permissions:\s*write-all/.test(lower)) hasWriteAll = true;
  }

  if (!anyOnPullRequest) {
    addCheck(
      ctx,
      "ci-pull-request",
      "ci",
      "At least one workflow runs on pull_request",
      "warn",
      "No workflow is triggered by pull_request events. Pull requests are not gated by CI.",
      { file: ".github/workflows/" },
    );
    ctx.findings.push(
      makeFinding(
        "ci-no-pr-trigger",
        "No CI runs on pull_request",
        "No workflow triggers on pull_request. Open PRs may merge without running the test suite.",
        "medium",
        "ci",
        "Add `on: pull_request` to at least one workflow so every PR runs the test suite before merge.",
        { file: ".github/workflows/" },
      ),
    );
  } else {
    addCheck(
      ctx,
      "ci-pull-request",
      "ci",
      "At least one workflow runs on pull_request",
      "pass",
      "At least one workflow is triggered by pull_request.",
      { file: ".github/workflows/" },
    );
  }

  if (!runsTests) {
    addCheck(
      ctx,
      "ci-tests",
      "ci",
      "A workflow runs the test suite",
      "warn",
      "No workflow appears to run a test suite (npm/pnpm/yarn test).",
      { file: ".github/workflows/" },
    );
    ctx.findings.push(
      makeFinding(
        "ci-no-tests",
        "CI does not run a test suite",
        "No workflow runs a test suite. Bugs may slip through to the default branch.",
        "medium",
        "ci",
        "Add a step that runs `npm test` (or the equivalent) to a workflow triggered on push and pull_request.",
        { file: ".github/workflows/" },
      ),
    );
  } else {
    addCheck(
      ctx,
      "ci-tests",
      "ci",
      "A workflow runs the test suite",
      "pass",
      "A test step is present in the workflows.",
      { file: ".github/workflows/" },
    );
  }

  if (!runsAudit) {
    addCheck(
      ctx,
      "ci-audit",
      "ci",
      "A workflow runs dependency audit",
      "info",
      "No workflow runs a dependency audit (npm audit, pip-audit, etc.).",
      { file: ".github/workflows/" },
    );
  } else {
    addCheck(
      ctx,
      "ci-audit",
      "ci",
      "A workflow runs dependency audit",
      "pass",
      "A dependency audit step is present.",
      { file: ".github/workflows/" },
    );
  }

  if (hasWriteAll) {
    addCheck(
      ctx,
      "ci-permissions",
      "ci",
      "Workflow permissions are scoped",
      "fail",
      "At least one workflow uses `permissions: write-all`. This grants every step write access by default.",
      { file: ".github/workflows/" },
    );
    ctx.findings.push(
      makeFinding(
        "ci-permissions-write-all",
        "Workflow uses permissions: write-all",
        "At least one workflow uses `permissions: write-all`. Every step can read AND write to the repository by default; prefer the least-privilege default of `permissions: read-all` or a scoped permissions block.",
        "high",
        "ci",
        "Replace `permissions: write-all` with `permissions: read-all` at the workflow level, then escalate per-job with `permissions:` as needed.",
        { file: ".github/workflows/" },
      ),
    );
  } else {
    addCheck(
      ctx,
      "ci-permissions",
      "ci",
      "Workflow permissions are scoped",
      "pass",
      "No `permissions: write-all` was detected.",
      { file: ".github/workflows/" },
    );
  }
}

function checkMetadata(ctx: ScanContext): void {
  const meta = ctx.repo.metadata;

  if (!meta.description || meta.description.trim().length === 0) {
    addCheck(
      ctx,
      "meta-description",
      "metadata",
      "Repository has a description",
      "info",
      "No repository description is set on GitHub.",
    );
    ctx.findings.push(
      makeFinding(
        "meta-no-description",
        "Repository description is empty",
        "No description is set on GitHub. Search results and the repo header will look incomplete.",
        "info",
        "metadata",
        "Open Settings and add a one-line description of what the repository does.",
      ),
    );
  } else {
    addCheck(
      ctx,
      "meta-description",
      "metadata",
      "Repository has a description",
      "pass",
      `Description: "${truncateDescription(meta.description)}"`,
    );
  }

  if (!meta.topics || meta.topics.length === 0) {
    addCheck(
      ctx,
      "meta-topics",
      "metadata",
      "Repository topics are set",
      "info",
      "No topics are set. The repo is harder to find via GitHub search.",
    );
  } else {
    addCheck(
      ctx,
      "meta-topics",
      "metadata",
      "Repository topics are set",
      "pass",
      `${meta.topics.length} topic(s): ${meta.topics.slice(0, 5).join(", ")}${meta.topics.length > 5 ? "\u2026" : ""}`,
    );
  }

  if (meta.archived) {
    addCheck(
      ctx,
      "meta-archived",
      "metadata",
      "Repository is not archived",
      "info",
      "The repository is marked as archived. Issues and PRs are disabled on GitHub.",
    );
    ctx.findings.push(
      makeFinding(
        "meta-archived",
        "Repository is archived",
        "This repository is archived. No new issues or PRs can be opened on GitHub.",
        "info",
        "metadata",
        "Unarchive the repository (Settings -> General -> Archive) if it is still being maintained, otherwise note this in the README.",
      ),
    );
  } else {
    addCheck(
      ctx,
      "meta-archived",
      "metadata",
      "Repository is not archived",
      "pass",
      "Repository is active.",
    );
  }

  if (meta.defaultBranch && /^master$/i.test(meta.defaultBranch)) {
    addCheck(
      ctx,
      "meta-branch",
      "metadata",
      "Default branch is not 'master'",
      "info",
      "The default branch is 'master'. Many ecosystems and tools now default to 'main'.",
    );
    ctx.findings.push(
      makeFinding(
        "meta-master-branch",
        "Default branch is 'master'",
        "The default branch is 'master'. Renaming it to 'main' matches current ecosystem conventions.",
        "info",
        "metadata",
        "Use `git branch -m master main` and update the default branch in GitHub repository settings.",
      ),
    );
  } else {
    addCheck(
      ctx,
      "meta-branch",
      "metadata",
      "Default branch is not 'master'",
      "pass",
      `Default branch is '${meta.defaultBranch}'.`,
    );
  }

  if (!meta.licenseSpdxId) {
    addCheck(
      ctx,
      "meta-license",
      "metadata",
      "License detected on GitHub",
      "warn",
      "GitHub did not detect a license for this repository. The LICENSE file may be missing or non-standard.",
    );
  } else {
    addCheck(
      ctx,
      "meta-license",
      "metadata",
      "License detected on GitHub",
      "pass",
      `License: ${meta.licenseSpdxId}${meta.licenseName ? ` (${meta.licenseName})` : ""}`,
    );
  }
}

function truncateDescription(s: string, max = 80): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "\u2026";
}

function checkCodePatterns(ctx: ScanContext): void {
  const TARGET_EXT = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
  ]);
  const SKIP_DIRS = ["node_modules", "dist", "build", ".next", "out", "coverage", ".git", "vendor"];

  for (const file of ctx.repo.files) {
    const lower = file.path.toLowerCase();
    if (SKIP_DIRS.some((d) => lower.includes(`/${d}/`) || lower.startsWith(`${d}/`))) {
      continue;
    }
    if (isTestFile(lower)) continue;
    if (![...TARGET_EXT].some((ext) => lower.endsWith(ext))) continue;
    if (file.content.length > 1_500_000) continue;

    const lines = getLines(file.content);
    const ext = lower.match(/\.([a-z0-9]+)$/)?.[1] ?? "default";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (isCommentedLine(line, ext)) continue;

      const evalMatch = /\beval\s*\(/.exec(line);
      if (evalMatch) {
        if (!isInsideString(line, evalMatch.index)) {
          addFindingAndCheck(
            ctx,
            {
              id: `code-eval-${file.path}-${i + 1}`,
              title: "Use of eval()",
              description:
                "eval() executes arbitrary strings as code and is almost always a remote code execution risk.",
              severity: "high",
              category: "code",
              fix: "Replace eval() with a safer alternative (JSON.parse for data, explicit dispatch for code paths).",
              file: file.path,
              line: i + 1,
              evidence: maskLine(line).slice(0, 200),
            },
            {
              id: "code-eval",
              category: "code",
              title: "No use of eval() in source",
              file: file.path,
              line: i + 1,
            },
          );
          break;
        }
      }

      const fnMatch = /\bnew\s+Function\s*\(/.exec(line);
      if (fnMatch) {
        if (!isInsideString(line, fnMatch.index)) {
          addFindingAndCheck(
            ctx,
            {
              id: `code-new-function-${file.path}-${i + 1}`,
              title: "Use of new Function()",
              description:
                "new Function() evaluates a string at runtime, with the same risks as eval().",
              severity: "high",
              category: "code",
              fix: "Replace with a static function or a safe evaluator with a strict grammar.",
              file: file.path,
              line: i + 1,
              evidence: maskLine(line).slice(0, 200),
            },
            {
              id: "code-new-function",
              category: "code",
              title: "No use of new Function() in source",
              file: file.path,
              line: i + 1,
            },
          );
          break;
        }
      }

      const dsrMatch = /dangerouslySetInnerHTML/.exec(line);
      if (dsrMatch) {
        if (!isInsideString(line, dsrMatch.index) && !isInsideRegexLiteral(line, dsrMatch.index)) {
          addFindingAndCheck(
            ctx,
            {
              id: `code-dangerously-set-${file.path}-${i + 1}`,
              title: "Use of dangerouslySetInnerHTML",
              description:
                "dangerouslySetInnerHTML injects raw HTML into the DOM and bypasses React's XSS protections. Make sure the input is sanitized.",
              severity: "medium",
              category: "code",
              fix: "Sanitize input with DOMPurify (or equivalent) before passing it to dangerouslySetInnerHTML, or render via React children instead.",
              file: file.path,
              line: i + 1,
              evidence: maskLine(line).slice(0, 200),
            },
            {
              id: "code-dangerously-set",
              category: "code",
              title: "dangerouslySetInnerHTML is sanitized",
              file: file.path,
              line: i + 1,
            },
          );
          break;
        }
      }
    }
  }
}

function addFindingAndCheck(
  ctx: ScanContext,
  finding: Finding,
  check: { id: string; category: FindingCategory; title: string; file: string; line: number },
): void {
  ctx.findings.push(finding);
  if (!ctx.checks.find((c) => c.id === check.id)) {
    addCheck(
      ctx,
      check.id,
      check.category,
      check.title,
      "fail",
      finding.description,
      { file: check.file, line: check.line },
    );
  }
}

function checkDependencies(ctx: ScanContext): void {
  const pkg = findFile(ctx.repo.files, "package.json");
  if (pkg) {
    let parsed:
      | {
          engines?: Record<string, string>;
          private?: boolean;
          repository?: unknown;
          name?: string;
          version?: string;
        }
      | null = null;
    try {
      parsed = JSON.parse(pkg.content);
    } catch {
      parsed = null;
    }

    if (parsed) {
      if (!parsed.engines || Object.keys(parsed.engines).length === 0) {
        addCheck(
          ctx,
          "dep-engines",
          "dependencies",
          "package.json declares an engines field",
          "info",
          "No `engines` field. Consumers cannot tell which Node version the package supports.",
          { file: "package.json" },
        );
      } else {
        addCheck(
          ctx,
          "dep-engines",
          "dependencies",
          "package.json declares an engines field",
          "pass",
          `Engines: ${Object.entries(parsed.engines).map(([k, v]) => `${k}=${v}`).join(", ")}`,
          { file: "package.json" },
        );
      }

      if (!parsed.repository) {
        addCheck(
          ctx,
          "dep-repository",
          "dependencies",
          "package.json has a repository field",
          "info",
          "No `repository` field. npm and other tools cannot link back to the source.",
          { file: "package.json" },
        );
      } else {
        addCheck(
          ctx,
          "dep-repository",
          "dependencies",
          "package.json has a repository field",
          "pass",
          "Repository field is set.",
          { file: "package.json" },
        );
      }
    }
  }

  if (ctx.repo.extraLockfiles.length > 0) {
    addCheck(
      ctx,
      "dep-lockfile",
      "dependencies",
      "Single lockfile",
      "warn",
      `Multiple lockfiles detected: ${ctx.repo.primaryLockfile ?? "(none)"}, ${ctx.repo.extraLockfiles.join(", ")}. This causes non-deterministic installs.`,
    );
    ctx.findings.push(
      makeFinding(
        "dep-multiple-lockfiles",
        "Multiple lockfiles present",
        `Detected ${ctx.repo.extraLockfiles.length + 1} lockfiles: ${[ctx.repo.primaryLockfile, ...ctx.repo.extraLockfiles].filter(Boolean).join(", ")}. Pick one package manager to keep installs deterministic.`,
        "medium",
        "dependencies",
        "Delete every lockfile except the one matching your chosen package manager, then re-run `npm install` (or yarn/pnpm/bun).",
      ),
    );
  } else if (ctx.repo.primaryLockfile) {
    addCheck(
      ctx,
      "dep-lockfile",
      "dependencies",
      "Single lockfile",
      "pass",
      `Lockfile: ${ctx.repo.primaryLockfile}`,
    );
  } else {
    addCheck(
      ctx,
      "dep-lockfile",
      "dependencies",
      "Single lockfile",
      "info",
      "No lockfile detected. Add one for reproducible installs.",
    );
  }
}

function checkSecrets(ctx: ScanContext): void {
  const MAX_FINDINGS = 200;

  function isBinary(content: string): boolean {
    const sample = content.length > 8192 ? content.slice(0, 8192) : content;
    return sample.indexOf("\0") !== -1 || /[\x01-\x08\x0E-\x1F]/.test(sample);
  }

  function lineAtOffset(lineOffsets: number[], index: number): number {
    let lo = 0;
    let hi = lineOffsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (lineOffsets[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  function buildLineOffsets(content: string): number[] {
    const offsets = [0];
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) === 10) offsets.push(i + 1);
    }
    return offsets;
  }

  const priorityFiles: { file: RepoFile; priority: number }[] = [];
  for (const file of ctx.repo.files) {
    if (!isLikelySecretScanPath(file.path, file.content.length)) continue;
    if (isTestFile(file.path.toLowerCase())) continue;
    if (isBinary(file.content)) continue;

    priorityFiles.push({ file, priority: secretScanPriority(file.path) });
  }
  priorityFiles.sort((a, b) => b.priority - a.priority);
  for (const { file } of priorityFiles) {
    ctx.filesChecked.add(file.path);
  }

  const filesWithNeedles = priorityFiles.filter(({ file }) =>
    fileContainsAnyNeedle(file.content),
  );
  const filesToScanForAll = priorityFiles;

  let totalMatches = 0;
  const perFile: Record<string, number> = {};
  const perPattern: Record<string, number> = {};
  const NEEDLE_LESS = SECRET_PATTERNS.filter((p) => p.needles.length === 0);
  const NEEDLE_BASED = SECRET_PATTERNS.filter((p) => p.needles.length > 0);

  const pushFinding = (
    file: RepoFile,
    pattern: (typeof SECRET_PATTERNS)[number],
    match: RegExpExecArray,
    offsets: number[],
    lines: string[],
    ext: string,
  ): void => {
    const matchedValue = match[1] ?? match[0];
    if (isLikelyPlaceholder(matchedValue)) return;
    const startIdx = match.index;
    const line = lineAtOffset(offsets, startIdx);
    const rawLine = lines[line - 1] ?? "";
    if (isCommentedLine(rawLine, ext)) return;
    ctx.findings.push(
      makeFinding(
        `secret-${pattern.name.replace(/\s+/g, "-").toLowerCase()}-${file.path}-${line}`,
        `Possible ${pattern.name} found`,
        `${pattern.description} This is a heuristic, not a guarantee \u2014 always confirm before rotating.`,
        pattern.severity,
        "secret",
        `Move the value out of source: store it in a secret manager or environment variable, rotate the original value, and rewrite the file with a placeholder.`,
        {
          file: file.path,
          line,
          evidence: maskLine(rawLine).slice(0, 200),
          confidence: confidenceForSecretPattern(pattern.name),
          fingerprint: fingerprintSecret(matchedValue),
          fixPrompt: `Look at the file \`${file.path}\` around line ${line}. Replace the suspected secret with a placeholder and reference an environment variable instead.`,
        },
      ),
    );
    const finding = ctx.findings.at(-1);
    if (ctx.collectSecretCandidates && finding) {
      ctx.secretCandidates.push({
        findingId: finding.id,
        patternName: pattern.name,
        value: matchedValue,
      });
    }
    totalMatches++;
    perFile[file.path] = (perFile[file.path] ?? 0) + 1;
    perPattern[pattern.name] = (perPattern[pattern.name] ?? 0) + 1;
  };

  const scanFileWithPatterns = (
    file: RepoFile,
    patterns: typeof SECRET_PATTERNS,
  ): void => {
    const offsets = buildLineOffsets(file.content);
    const lines = file.content.split(/\r?\n/);
    const ext = file.path.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "default";
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(file.content)) !== null) {
        pushFinding(file, pattern, match, offsets, lines, ext);
        if (ctx.findings.length > MAX_FINDINGS) {
          addCheck(
            ctx,
            "secret-scan",
            "secret",
            "No secret patterns in source",
            "fail",
            `Stopped after ${MAX_FINDINGS} matches. ${totalMatches} possible secret pattern(s) detected in ${priorityFiles.length} scanned file(s).`,
          );
          return;
        }
      }
    }
  };

  for (const { file } of filesWithNeedles) {
    scanFileWithPatterns(file, NEEDLE_BASED);
    if (ctx.findings.length > MAX_FINDINGS) {
      return;
    }
  }

  if (NEEDLE_LESS.length > 0) {
    for (const { file } of filesToScanForAll) {
      scanFileWithPatterns(file, NEEDLE_LESS);
      if (ctx.findings.length > MAX_FINDINGS) {
        return;
      }
    }
  }

  if (totalMatches === 0) {
    addCheck(
      ctx,
      "secret-scan",
      "secret",
      "No secret patterns in source",
      "pass",
      `No known secret patterns matched in ${priorityFiles.length} scanned file(s).`,
    );
  } else {
    const top = Object.entries(perPattern)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, n]) => `${name} (${n})`)
      .join(", ");
    addCheck(
      ctx,
      "secret-scan",
      "secret",
      "No secret patterns in source",
      "fail",
      `${totalMatches} possible secret pattern match(es) across ${Object.keys(perFile).length} file(s) of ${priorityFiles.length} scanned. Top: ${top}.`,
    );
  }
}

function buildSummary(ctx: ScanContext): ScanSummary {
  const byCategory: Record<FindingCategory, CategoryBreakdown> = {
    environment: { total: 0, passed: 0, failed: 0 },
    documentation: { total: 0, passed: 0, failed: 0 },
    package: { total: 0, passed: 0, failed: 0 },
    github: { total: 0, passed: 0, failed: 0 },
    secret: { total: 0, passed: 0, failed: 0 },
    docker: { total: 0, passed: 0, failed: 0 },
    community: { total: 0, passed: 0, failed: 0 },
    ci: { total: 0, passed: 0, failed: 0 },
    metadata: { total: 0, passed: 0, failed: 0 },
    code: { total: 0, passed: 0, failed: 0 },
    dependencies: { total: 0, passed: 0, failed: 0 },
  };
  let passed = 0;
  let failed = 0;
  for (const c of ctx.checks) {
    byCategory[c.category].total++;
    if (c.status === "pass" || c.status === "info") {
      byCategory[c.category].passed++;
      passed++;
    } else if (c.status === "skip") {
      // not counted as pass or fail
    } else {
      byCategory[c.category].failed++;
      failed++;
    }
  }
  return {
    totalChecks: ctx.checks.length,
    passed,
    failed,
    totalFindings: ctx.findings.length,
    filesChecked: ctx.filesChecked.size,
    filesMissing: Array.from(new Set(ctx.filesMissing)).sort(),
    byCategory,
    checks: ctx.checks,
  };
}

function groupFindingsByFile(findings: Finding[]): FileGroup[] {
  const map = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = f.file ?? "_general_";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(f);
  }
  const groups: FileGroup[] = [];
  for (const [path, items] of map.entries()) {
    const counts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const it of items) counts[it.severity]++;
    groups.push({ path, findings: items, counts });
  }
  groups.sort((a, b) => {
    const sevOrder: Record<Severity, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1,
    };
    const aMax = Math.max(...a.findings.map((f) => sevOrder[f.severity]), 0);
    const bMax = Math.max(...b.findings.map((f) => sevOrder[f.severity]), 0);
    if (aMax !== bMax) return bMax - aMax;
    return b.findings.length - a.findings.length;
  });
  return groups;
}

export interface ScanResult {
  findings: Finding[];
  summary: ScanSummary;
  filesChecked: string[];
  fileGroups: FileGroup[];
  secretCandidates?: SecretCandidate[];
}

export function runScan(
  repo: RepoData,
  options: { collectSecretCandidates?: boolean } = {},
): ScanResult {
  const ctx: ScanContext = {
    repo,
    findings: [],
    checks: [],
    filesChecked: new Set(),
    filesMissing: [],
    secretCandidates: [],
    collectSecretCandidates: options.collectSecretCandidates ?? false,
  };

  checkEnvironment(ctx);
  checkGitignore(ctx);
  checkDocumentation(ctx);
  checkPackage(ctx);
  checkGithub(ctx);
  checkDockerfile(ctx);
  checkCommunity(ctx);
  checkWorkflowQuality(ctx);
  checkMetadata(ctx);
  checkCodePatterns(ctx);
  checkDependencies(ctx);
  checkSecrets(ctx);

  const baseline = applyRepoBaseline(ctx.findings, ctx.repo.files);
  if (baseline.suppressed > 0) {
    ctx.findings = baseline.findings;
    addCheck(
      ctx,
      "baseline-suppression",
      "secret",
      "RepoSec baseline applied",
      "info",
      `${baseline.suppressed} reviewed finding(s) suppressed by .reposecignore or reposec-baseline.json.`,
    );
  }

  const summary = buildSummary(ctx);
  const fileGroups = groupFindingsByFile(ctx.findings);
  return {
    findings: ctx.findings,
    summary,
    filesChecked: Array.from(ctx.filesChecked).sort(),
    fileGroups,
    secretCandidates: options.collectSecretCandidates
      ? ctx.secretCandidates
      : undefined,
  };
}

export { SEVERITY_WEIGHT };
