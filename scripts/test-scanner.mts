import { runScan } from "../lib/scanner.ts";
import { isLikelySecretScanPath } from "../lib/scan-targets.ts";
import { generateSarifReport } from "../lib/exporters.ts";
import type { RepoData } from "../lib/types.ts";

function makeRepo(partial: Partial<RepoData> & { files: RepoData["files"] }): RepoData {
  return {
    metadata: {
      owner: "test",
      repo: "test",
      defaultBranch: "main",
      description: "A test repository",
      stars: 0,
      forks: 0,
      openIssues: 0,
      isPrivate: false,
      htmlUrl: "https://github.com/test/test",
      topics: [],
      archived: false,
      isTemplate: false,
      language: "TypeScript",
      sizeKb: 100,
      pushedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      licenseSpdxId: "MIT",
      licenseName: "MIT License",
    },
    fileTree: partial.files.map((f) => f.path),
    workflows: [],
    hasDependabot: false,
    hasWorkflows: false,
    hasIssueTemplate: false,
    hasCodeowners: false,
    hasPullRequestTemplate: false,
    hasDockerfile: false,
    hasDockerignore: false,
    hasChangelog: false,
    hasContributing: false,
    hasCodeOfConduct: false,
    primaryLockfile: null,
    extraLockfiles: [],
    ...partial,
  };
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` -- ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ""}`);
  }
}

function checkIds(
  result: ReturnType<typeof runScan>,
  passingIds: string[],
  failingIds: string[] = [],
) {
  const status = new Map<string, string>();
  for (const c of result.summary.checks) {
    status.set(c.id, c.status);
  }
  for (const id of passingIds) {
    assert(
      `check ${id} should pass`,
      status.get(id) === "pass" || status.get(id) === "info" || status.get(id) === "skip",
      `actual: ${status.get(id) ?? "missing"}`,
    );
  }
  for (const id of failingIds) {
    assert(
      `check ${id} should fail`,
      status.get(id) === "fail" || status.get(id) === "warn",
      `actual: ${status.get(id) ?? "missing"}`,
    );
  }
}

console.log("\n--- .gitignore .env* should pass ---");
{
  const repo = makeRepo({
    files: [
      { path: ".gitignore", content: "node_modules/\n.env*\n!.env.example\ndist/\n" },
      { path: "README.md", content: "# Test\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["gitignore-env", "gitignore-node-modules", "gitignore-build"], []);
}

console.log("\n--- .gitignore .env (exact) should pass ---");
{
  const repo = makeRepo({
    files: [
      { path: ".gitignore", content: ".env\n.env.local\n" },
      { path: "README.md", content: "# Test\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["gitignore-env"], []);
}

console.log("\n--- .gitignore .env.* should pass ---");
{
  const repo = makeRepo({
    files: [
      { path: ".gitignore", content: ".env.*\n" },
      { path: "README.md", content: "# Test\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["gitignore-env"], []);
}

console.log("\n--- .gitignore with **/.env* should pass ---");
{
  const repo = makeRepo({
    files: [
      { path: ".gitignore", content: "**/.env*\n**/node_modules/\n" },
      { path: "README.md", content: "# Test\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["gitignore-env", "gitignore-node-modules"], []);
}

console.log("\n--- .gitignore missing .env should fail ---");
{
  const repo = makeRepo({
    files: [
      { path: ".gitignore", content: "node_modules/\ndist/\n" },
      { path: "README.md", content: "# Test\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, [], ["gitignore-env"]);
}

console.log("\n--- README with `# Install` (h1) should pass readme-setup ---");
{
  const repo = makeRepo({
    files: [
      { path: "README.md", content: "# My Project\n\n# Install\n\nRun `npm install`.\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["readme-setup"], []);
}

console.log("\n--- README with `## Install` (h2) should pass ---");
{
  const repo = makeRepo({
    files: [
      { path: "README.md", content: "# My Project\n\n## Install\n\nRun `npm install`.\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["readme-setup"], []);
}

console.log("\n--- README with `## 🛠️ Installation` (emoji heading) should pass ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "README.md",
        content: "# My Project\n\n## 🛠️ Installation\n\nRun `npm install`.\n",
      },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["readme-setup"], []);
}

console.log("\n--- README with `## Getting Started` should pass ---");
{
  const repo = makeRepo({
    files: [
      { path: "README.md", content: "# My Project\n\n## Getting Started\n\nRun `npm install`.\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["readme-setup"], []);
}

console.log("\n--- README with `## Quickstart` should pass ---");
{
  const repo = makeRepo({
    files: [
      { path: "README.md", content: "# My Project\n\n## Quickstart\n\nRun `npm install`.\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["readme-setup"], []);
}

console.log("\n--- README missing setup should fail ---");
{
  const repo = makeRepo({
    files: [
      { path: "README.md", content: "# My Project\n\nA description.\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, [], ["readme-setup"]);
}

console.log("\n--- README with `## Environment Variables` should pass readme-env ---");
{
  const repo = makeRepo({
    files: [
      { path: "README.md", content: "# Project\n\n## Environment Variables\n\n`API_KEY`\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["readme-env"], []);
}

console.log("\n--- README with `## Configuration` should pass readme-env ---");
{
  const repo = makeRepo({
    files: [
      { path: "README.md", content: "# Project\n\n## Configuration\n\nSet the API key.\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["readme-env"], []);
}

console.log("\n--- README with `## Security` should pass readme-security ---");
{
  const repo = makeRepo({
    files: [
      { path: "README.md", content: "# Project\n\n## Security\n\nSee SECURITY.md.\n" },
    ],
  });
  const result = runScan(repo);
  checkIds(result, ["readme-security"], []);
}

console.log("\n--- Code pattern: eval in test file should NOT trigger ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "src/utils.test.ts",
        content: "it('handles eval', () => { eval('1+1'); });\n",
      },
    ],
  });
  const result = runScan(repo);
  const codeEval = result.findings.filter((f) => f.id.startsWith("code-eval"));
  assert("no code-eval finding for test file", codeEval.length === 0, `found ${codeEval.length}`);
}

console.log("\n--- Code pattern: eval in __tests__/ should NOT trigger ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "src/__tests__/utils.ts",
        content: "it('handles eval', () => { eval('1+1'); });\n",
      },
    ],
  });
  const result = runScan(repo);
  const codeEval = result.findings.filter((f) => f.id.startsWith("code-eval"));
  assert("no code-eval finding for __tests__/", codeEval.length === 0, `found ${codeEval.length}`);
}

console.log("\n--- Code pattern: eval in string literal should NOT trigger ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "src/warn.ts",
        content: "const msg = \"don't use eval() in production\";\n",
      },
    ],
  });
  const result = runScan(repo);
  const codeEval = result.findings.filter((f) => f.id.startsWith("code-eval"));
  assert(
    "no code-eval finding for string literal",
    codeEval.length === 0,
    `found ${codeEval.length}`,
  );
}

console.log("\n--- Code pattern: real eval() call SHOULD trigger ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "src/bad.ts",
        content: "function run(code: string) { return eval(code); }\n",
      },
    ],
  });
  const result = runScan(repo);
  const codeEval = result.findings.filter((f) => f.id.startsWith("code-eval"));
  assert("code-eval finding for real eval()", codeEval.length > 0, `found ${codeEval.length}`);
}

console.log("\n--- Code pattern: dangerouslySetInnerHTML in regex literal should NOT trigger ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "src/scanner.ts",
        content: "const match = /dangerouslySetInnerHTML/.exec(line);\n",
      },
    ],
  });
  const result = runScan(repo);
  const codeDangerousHtml = result.findings.filter((f) =>
    f.id.startsWith("code-dangerously-set"),
  );
  assert(
    "no code-dangerously-set finding for regex literal",
    codeDangerousHtml.length === 0,
    `found ${codeDangerousHtml.length}`,
  );
}

console.log("\n--- Code pattern: real dangerouslySetInnerHTML SHOULD trigger ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "src/render.tsx",
        content: "export function View({ html }: { html: string }) { return <div dangerouslySetInnerHTML={{ __html: html }} />; }\n",
      },
    ],
  });
  const result = runScan(repo);
  const codeDangerousHtml = result.findings.filter((f) =>
    f.id.startsWith("code-dangerously-set"),
  );
  assert(
    "code-dangerously-set finding for real JSX usage",
    codeDangerousHtml.length > 0,
    `found ${codeDangerousHtml.length}`,
  );
}

console.log("\n--- CI: cargo test should be detected ---");
{
  const repo = makeRepo({
    files: [
      {
        path: ".github/workflows/ci.yml",
        content: `name: CI
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo test
`,
      },
    ],
    hasWorkflows: true,
  });
  const result = runScan(repo);
  checkIds(result, ["ci-pull-request", "ci-tests"], []);
}

console.log("\n--- CI: pip-audit should be detected ---");
{
  const repo = makeRepo({
    files: [
      {
        path: ".github/workflows/ci.yml",
        content: `name: CI
on: pull_request
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip-audit
`,
      },
    ],
    hasWorkflows: true,
  });
  const result = runScan(repo);
  checkIds(result, ["ci-pull-request", "ci-audit"], []);
}

console.log("\n--- Metadata: 4-char description should pass ---");
{
  const repo = makeRepo({
    files: [{ path: "README.md", content: "# Project\n" }],
    metadata: {
      ...makeRepo({ files: [] }).metadata,
      description: "Code",
    },
  });
  const result = runScan(repo);
  const descCheck = result.summary.checks.find((c) => c.id === "meta-description");
  assert(
    "4-char description should pass meta-description",
    descCheck?.status === "pass",
    `actual: ${descCheck?.status}`,
  );
}

console.log("\n--- Secret scan target selection ---");
{
  assert("JavaScript source is selected", isLikelySecretScanPath("src/config.js", 1200));
  assert("Python source is selected", isLikelySecretScanPath("app/settings.py", 1200));
  assert("env examples are selected", isLikelySecretScanPath(".env.example", 1200));
  assert("nested env files are selected", isLikelySecretScanPath("services/api/.env.local", 1200));
  assert("node_modules are skipped", !isLikelySecretScanPath("node_modules/pkg/index.js", 1200));
  assert("large blobs are skipped", !isLikelySecretScanPath("src/huge.py", 2_000_000));
}

console.log("\n--- Baseline suppression ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "src/config.py",
        content: 'api_key = "realisticSecretValue123456"\n',
      },
      { path: ".reposecignore", content: "src/config.py:1\n" },
    ],
  });
  const result = runScan(repo);
  const secretFindings = result.findings.filter((f) => f.id.startsWith("secret-"));
  assert("baseline suppresses matching finding", secretFindings.length === 0);
  assert(
    "baseline check is recorded",
    result.summary.checks.some((c) => c.id === "baseline-suppression"),
  );
}

console.log("\n--- SARIF export ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "src/config.py",
        content: 'api_key = "realisticSecretValue123456"\n',
      },
    ],
  });
  const result = runScan(repo);
  const sarif = JSON.parse(
    generateSarifReport({
      repo: repo.metadata,
      score: 75,
      scoreBand: "good",
      summary: result.summary,
      findings: result.findings,
      filesChecked: result.filesChecked,
      fileGroups: result.fileGroups,
      scannedAt: new Date().toISOString(),
      durationMs: 1,
    }),
  );
  assert("SARIF version is 2.1.0", sarif.version === "2.1.0");
  assert("SARIF contains results", sarif.runs[0].results.length > 0);
}

console.log(`\n${passed} passed, ${failed} failed`);

const F = (a: string, b: string): string => a + b;
const A = (s: string, n: number): string => s.repeat(n);
const T0 = F("M", "TA") + "yMzQ1Njc4OTAxMjM0NTY3";
const T1 = "GhIjKl";
const T2 = "MnOpQrStUvWxYz" + "AbCdEfGhIjKl" + "MnOpQrStUvWxYzAb";
const DISCORD = T0 + "." + T1 + "." + T2;
const TWILIO = F("SK", "0123456789abcdef") + "0123456789abcdef";
const NPM = "npm" + "_AbCdEfGhIjKlMnOpQrStUvWxYz0123456" + "789012";
const ANTHROPIC =
  "sk-ant-api03-" + "abcdefghijklmnopqrstuvwxyz" + "1234567890ABCD";
const GROQ = F("gsk_", "AbCdEfGhIjKlMnOpQrStUvWxYz012345") + "6789";
const HF = F("hf_", "AbCdEfGhIjKlMnOpQrStUvWxYz0123456") + "789";
const GITHUB =
  F("ghp_", "AbCdEfGhIjKlMnOpQrStUvWxYz012345678") + "9";
const GITLAB =
  F("glpat-", "AbCdEfGhIjKlMnOpQrStUvWxYz012345") + "6789";
const TELEGRAM = "1234567890:" + "AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhI";
const SENDGRID =
  "SG.abcdefghijklmnopqrstuv." + A("A", 27) + "-" + A("A", 20);
const MAILGUN = F("key-", "0123456789abcdef0123456789abcde") + "f";
const SUPABASE =
  F("sbp_", "0123456789abcdef0123456789abcdef0123456") + "7";
const LINEAR =
  F("lin_api_", "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789") + "AbCd";
const SHOPIFY =
  F("shpat_", "abcdef0123456789abcdef0123456") + "789ab";
const PSCALE =
  F("pscale_tkn_", "AbCdEfGhIjKlMnOpQrStUvWxYz012") + "3456789AbCdEfGh";
const OPS =
  F("ops_", "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789") + "AbCdEfGhIjK";
const DOPPLER =
  F("dp.st.", "AbCdEfGhIjKlMnOpQrStUvWxYz012345") + "6789AbCdEfGhIjK";
const POSTMAN =
  F("PMAK-", "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789AbCdEfGhIjKlMnOpQrStUvWxYz0") +
  "1";
const MAPBOX =
  F("sk.eyJ", "abcdefghijklmnopqrstuvwxyz012345") +
  "6789." +
  A("A", 30);
const PEM =
  "-----BEGIN ENCRYPTED PRIVATE KEY-----\nABCDEFG\n-----END ENCRYPTED PRIVATE KEY-----\n";
const NPMRC =
  "//registry.npmjs.org/:_authToken=" +
  F("npm_", "AbCdEfGhIjKlMnOpQrStUvWxYz0123456") +
  "789012";
const PYPIRC =
  "[pypi]\nusername = __token__\npassword = pypi-AgEIcHlwaS5vcmc" +
  "RANDOMSTRING1234567890abc\n";
const BEARER = `const headers = { Authorization: "Bearer eyAbcdefghijk.lmnopqrstuv.wxyzABCDEFG" };\n`;
const BASIC_AUTH =
  'const url = "https://' +
  "alice" +
  ":" +
  "secret123" +
  '@example.com/api";\n';
const ENV_GITHUB = "GITHUB_TOKEN=" + GITHUB + "\n";
const TF_VAR = 'password = "mySuperSecretValue123"\n';

// ---- gitleaks-derived fixtures (prefixes split to avoid push-protection scans) ----
const ANTHROPIC_ADMIN =
  F("sk-ant-admin01-", A("A", 93)) + "AA";
const PERPLEXITY = F("pplx-", A("A", 48));
const NOTION = F("ntn_", "12345678901") + A("a", 32) + A("A", 3);
const HF_ORG = F("api_org_", A("a", 34));
const ABSK = F("ABSK", A("A", 100)) + A("a", 9) + "==";
const AZURE = "abc8" + "Q~" + A("a", 8) + A("A", 24);
const ALIBABA = F("LTAI", A("a", 20));
const HEROKU = F("HRKU-AA", A("a", 58));
const PULUMI = F("pul-", A("0", 40));
const FLY = F("fo1_", A("a", 43));
const NRAK = F("NRAK-", A("a", 27));
const NRII = F("NRII-", A("a", 32));
const DYNATRACE = F("dt0c01.", A("a", 24)) + "." + A("0", 64);
const GRAFANA = F("glc_", A("A", 30)) + A("a", 10) + "==";
const DATABRICKS = F("dapi", A("0", 32));
const VAULT_SVC = F("hvs.", A("a", 100));
const VAULT_BATCH = F("hvb.", A("a", 150));
const TF_CLOUD = A("a", 14) + "." + F("atlasv1", ".") + A("a", 65);
const EASYPOST = F("EZAK", A("a", 54));
const README = F("rdme_", A("0", 70));
const PREFECT = F("pnu_", A("a", 36));
const SOURCEGRAPH = F("sgp_", A("0", 16)) + "_" + A("0", 40);
const SLACK_WEBHOOK =
  "https://hooks.slack.com/services/T0" +
 A("A", 9) +
 "/" +
 A("A", 9) +
 "/" +
 A("A", 24);
const TEAMS_WEBHOOK =
  "https://company.webhook.office.com/webhookb2/" +
 "abcdef12-1234-1234-1234-abcdef123456@abcdef12-1234-1234-1234-abcdef123456" +
 "/IncomingWebhook/" +
 A("0", 32) +
 "/abcdef12-1234-1234-1234-abcdef123456";
const CURL_AUTH_HDR =
  'curl -H "Authorization: Bearer abcdefghijklmnopqrstuv" https://api.example.com\n';
const CURL_BASIC_AUTH =
  'curl -u "alice:supersecret" https://api.example.com\n';
const TF_PWD = 'administrator_login_password = "PAssword12345"\n';

function hasFinding(result: ReturnType<typeof runScan>, needle: string): boolean {
  return result.findings.some((f) => f.id.includes(needle));
}

function secretTest(name: string, path: string, content: string, expectNeedle: string) {
  const repo = makeRepo({ files: [{ path, content }] });
  const result = runScan(repo);
  const found = hasFinding(result, expectNeedle);
  if (!found) {
    console.log(
      `    DEBUG ${name}: findings =`,
      result.findings.map((f) => f.id),
    );
  }
  assert(name, found, expectNeedle);
}

console.log("\n--- Anthropic API key ---");
secretTest(
  "sk-ant-... triggers Anthropic pattern",
  "src/config.ts",
  `export const KEY = "${ANTHROPIC}";\n`,
  "anthropic-api-key",
);

console.log("\n--- Groq API key ---");
secretTest(
  "gsk_... triggers Groq pattern",
  "src/llm.ts",
  `const key = "${GROQ}";\n`,
  "groq-api-key",
);

console.log("\n--- HuggingFace token ---");
secretTest(
  "hf_... triggers HuggingFace pattern",
  "src/hf.ts",
  `const token = "${HF}";\n`,
  "huggingface-token",
);

console.log("\n--- GitLab token ---");
secretTest(
  "glpat-... triggers GitLab pattern",
  "src/ci.ts",
  `const t = "${GITLAB}";\n`,
  "gitlab-token",
);

console.log("\n--- npm publish token ---");
secretTest(
  "npm_... triggers npm pattern",
  "src/publish.ts",
  `const t = "${NPM}";\n`,
  "npm-token",
);

console.log("\n--- Discord bot token ---");
secretTest(
  "Discord bot token pattern matches",
  "src/bot.ts",
  `const t = "${DISCORD}";\n`,
  "discord-bot-token",
);

console.log("\n--- Telegram bot token ---");
secretTest(
  "Telegram bot token pattern matches",
  "src/tg.ts",
  `const t = "${TELEGRAM}";\n`,
  "telegram-bot-token",
);

console.log("\n--- Twilio API key ---");
secretTest(
  "Twilio SK prefix matches",
  "src/twilio.ts",
  `const sid = "${TWILIO}";\n`,
  "twilio-api-key",
);

console.log("\n--- SendGrid API key ---");
secretTest(
  "SendGrid SG. prefix matches",
  "src/email.ts",
  `const k = "${SENDGRID}";\n`,
  "sendgrid-api-key",
);

console.log("\n--- Mailgun API key ---");
secretTest(
  "Mailgun key- prefix matches",
  "src/mail.ts",
  `const k = "${MAILGUN}";\n`,
  "mailgun-api-key",
);

console.log("\n--- Supabase service-role key ---");
secretTest(
  "sbp_ prefix matches Supabase pattern",
  "src/supa.ts",
  `const k = "${SUPABASE}";\n`,
  "supabase-token",
);

console.log("\n--- Linear API key ---");
secretTest(
  "lin_api_ prefix matches Linear pattern",
  "src/linear.ts",
  `const k = "${LINEAR}";\n`,
  "linear-api-key",
);

console.log("\n--- Shopify token ---");
secretTest(
  "shpat_ prefix matches Shopify pattern",
  "src/shop.ts",
  `const t = "${SHOPIFY}";\n`,
  "shopify-token",
);

console.log("\n--- PlanetScale token ---");
secretTest(
  "pscale_tkn_ prefix matches PlanetScale pattern",
  "src/ps.ts",
  `const t = "${PSCALE}";\n`,
  "planetscale-token",
);

console.log("\n--- 1Password service account token ---");
secretTest(
  "ops_ prefix matches 1Password pattern",
  "src/op.ts",
  `const t = "${OPS}";\n`,
  "1password-service-account",
);

console.log("\n--- Doppler CLI token ---");
secretTest(
  "dp.st. prefix matches Doppler pattern",
  "src/dop.ts",
  `const t = "${DOPPLER}";\n`,
  "doppler-cli-token",
);

console.log("\n--- Postman API key ---");
secretTest(
  "PMAK- prefix matches Postman pattern",
  "src/pm.ts",
  `const t = "${POSTMAN}";\n`,
  "postman-api-key",
);

console.log("\n--- Mapbox secret token ---");
secretTest(
  "sk.eyJ prefix matches Mapbox pattern",
  "src/mb.ts",
  `const t = "${MAPBOX}";\n`,
  "mapbox-secret-token",
);

console.log("\n--- Encrypted private key block ---");
secretTest(
  "ENCRYPTED PRIVATE KEY block matches",
  "src/key.pem",
  PEM,
  "private-key-block",
);

console.log("\n--- .npmrc _authToken ---");
secretTest(
  "npmrc _authToken is detected",
  ".npmrc",
  NPMRC,
  ".npmrc-_authtoken",
);

console.log("\n--- .pypirc password ---");
secretTest(
  "pypirc password is detected",
  ".pypirc",
  PYPIRC,
  "pypi-token",
);

console.log("\n--- Bearer token ---");
secretTest(
  "Bearer token is detected",
  "src/api.ts",
  BEARER,
  "bearer-token-in-header",
);

console.log("\n--- Basic auth URL ---");
secretTest(
  "Basic auth credentials in URL is detected",
  "src/conn.ts",
  BASIC_AUTH,
  "basic-auth-in-url",
);

console.log("\n--- .env file ---");
secretTest(
  ".env file with GitHub token is detected",
  ".env",
  ENV_GITHUB,
  "github-token",
);

console.log("\n--- Terraform variable ---");
secretTest(
  "TF variable with secret value is detected",
  "main.tf",
  TF_VAR,
  "terraform-variable-with-secret-name",
);

console.log("\n--- Anthropic Admin API key ---");
secretTest(
  "sk-ant-admin01-... triggers Anthropic Admin pattern",
  "src/admin.ts",
  `export const KEY = "${ANTHROPIC_ADMIN}";\n`,
  "anthropic-admin-api-key",
);

console.log("\n--- Perplexity API key ---");
secretTest(
  "pplx-... triggers Perplexity pattern",
  "src/llm.ts",
  `const key = "${PERPLEXITY}";\n`,
  "perplexity-api-key",
);

console.log("\n--- Notion API token ---");
secretTest(
  "ntn_... triggers Notion pattern",
  "src/notion.ts",
  `const t = "${NOTION}";\n`,
  "notion-api-token",
);

console.log("\n--- HuggingFace Org token ---");
secretTest(
  "api_org_... triggers HuggingFace Org pattern",
  "src/hf-org.ts",
  `const t = "${HF_ORG}";\n`,
  "huggingface-org-token",
);

console.log("\n--- AWS Bedrock long-lived key ---");
secretTest(
  "ABSK... triggers Bedrock pattern",
  "src/bedrock.ts",
  `const k = "${ABSK}";\n`,
  "aws-bedrock-long-lived-api-key",
);

console.log("\n--- Azure AD client secret ---");
secretTest(
  "8Q~ marker triggers Azure AD pattern",
  "src/azure.ts",
  `const s = "${AZURE}";\n`,
  "azure-ad-client-secret",
);

console.log("\n--- Alibaba AccessKey ID ---");
secretTest(
  "LTAI prefix triggers Alibaba pattern",
  "src/alicloud.ts",
  `const k = "${ALIBABA}";\n`,
  "alibaba-accesskey-id",
);

console.log("\n--- Heroku API key v2 ---");
secretTest(
  "HRKU-AA prefix triggers Heroku pattern",
  "src/heroku.ts",
  `const k = "${HEROKU}";\n`,
  "heroku-api-key-v2",
);

console.log("\n--- Pulumi API token ---");
secretTest(
  "pul- prefix triggers Pulumi pattern",
  "src/pulumi.ts",
  `const t = "${PULUMI}";\n`,
  "pulumi-api-token",
);

console.log("\n--- Fly.io access token ---");
secretTest(
  "fo1_ prefix triggers Fly.io pattern",
  "src/fly.ts",
  `const t = "${FLY}";\n`,
  "fly.io-access-token",
);

console.log("\n--- New Relic user API key ---");
secretTest(
  "NRAK- prefix triggers New Relic pattern",
  "src/nr.ts",
  `const k = "${NRAK}";\n`,
  "new-relic-user-api-key",
);

console.log("\n--- New Relic insert key ---");
secretTest(
  "NRII- prefix triggers New Relic insert pattern",
  "src/nr-insert.ts",
  `const k = "${NRII}";\n`,
  "new-relic-insert-key",
);

console.log("\n--- Dynatrace API token ---");
secretTest(
  "dt0c01. prefix triggers Dynatrace pattern",
  "src/dynatrace.ts",
  `const t = "${DYNATRACE}";\n`,
  "dynatrace-api-token",
);

console.log("\n--- Grafana Cloud API token ---");
secretTest(
  "glc_ prefix triggers Grafana Cloud pattern",
  "src/grafana.ts",
  `const t = "${GRAFANA}";\n`,
  "grafana-cloud-api-token",
);

console.log("\n--- Databricks API token ---");
secretTest(
  "dapi prefix triggers Databricks pattern",
  "src/databricks.ts",
  `const t = "${DATABRICKS}";\n`,
  "databricks-api-token",
);

console.log("\n--- HashiCorp Vault service token ---");
secretTest(
  "hvs. prefix triggers Vault service pattern",
  "src/vault.ts",
  `const t = "${VAULT_SVC}";\n`,
  "hashicorp-vault-service-token",
);

console.log("\n--- HashiCorp Vault batch token ---");
secretTest(
  "hvb. prefix triggers Vault batch pattern",
  "src/vault-batch.ts",
  `const t = "${VAULT_BATCH}";\n`,
  "hashicorp-vault-batch-token",
);

console.log("\n--- HashiCorp Terraform Cloud API token ---");
secretTest(
  "atlasv1 marker triggers TF Cloud pattern",
  "src/tfcloud.ts",
  `const t = "${TF_CLOUD}";\n`,
  "hashicorp-terraform-cloud-api-token",
);

console.log("\n--- EasyPost API token ---");
secretTest(
  "EZAK prefix triggers EasyPost pattern",
  "src/easypost.ts",
  `const t = "${EASYPOST}";\n`,
  "easypost-api-token",
);

console.log("\n--- ReadMe API token ---");
secretTest(
  "rdme_ prefix triggers ReadMe pattern",
  "src/readme.ts",
  `const t = "${README}";\n`,
  "readme-api-token",
);

console.log("\n--- Prefect API token ---");
secretTest(
  "pnu_ prefix triggers Prefect pattern",
  "src/prefect.ts",
  `const t = "${PREFECT}";\n`,
  "prefect-api-token",
);

console.log("\n--- Sourcegraph access token ---");
secretTest(
  "sgp_ prefix triggers Sourcegraph pattern",
  "src/sg.ts",
  `const t = "${SOURCEGRAPH}";\n`,
  "sourcegraph-access-token",
);

console.log("\n--- Slack webhook URL ---");
secretTest(
  "hooks.slack.com/services URL is detected",
  "src/slack.ts",
  `const hook = "${SLACK_WEBHOOK}";\n`,
  "slack-webhook-url",
);

console.log("\n--- Microsoft Teams webhook URL ---");
secretTest(
  "webhook.office.com URL is detected",
  "src/teams.ts",
  `const hook = "${TEAMS_WEBHOOK}";\n`,
  "microsoft-teams-webhook-url",
);

console.log("\n--- Curl Authorization header ---");
secretTest(
  "curl -H with Bearer triggers pattern",
  "scripts/call.sh",
  CURL_AUTH_HDR,
  "curl-authorization-header",
);

console.log("\n--- Curl Basic Auth user ---");
secretTest(
  "curl -u with user:pass triggers pattern",
  "scripts/call.sh",
  CURL_BASIC_AUTH,
  "curl-basic-auth-user",
);

console.log("\n--- HashiCorp TF password in .tf ---");
secretTest(
  "administrator_login_password in .tf triggers pattern",
  "main.tf",
  TF_PWD,
  "hashicorp-terraform-password",
);

console.log("\n--- Efficiency: file with no needles is skipped ---");
{
  const start = Date.now();
  const noise = "x".repeat(50_000);
  const repo = makeRepo({
    files: [
      { path: "src/large.ts", content: noise },
      { path: "src/noise.txt", content: noise },
    ],
  });
  const result = runScan(repo);
  const elapsed = Date.now() - start;
  const secretFindings = result.findings.filter((f) => f.id.startsWith("secret-"));
  assert(
    "no secret findings for content-free file",
    secretFindings.length === 0,
    `got ${secretFindings.length}`,
  );
  assert(
    "scan completes in reasonable time",
    elapsed < 3000,
    `took ${elapsed}ms`,
  );
}

console.log("\n--- Efficiency: file with content but no needles is fast ---");
{
  const lines: string[] = [];
  for (let i = 0; i < 1000; i++) {
    lines.push(`const x${i} = "value ${i}";`);
  }
  const repo = makeRepo({
    files: [
      { path: "src/big.ts", content: lines.join("\n") },
    ],
  });
  const start = Date.now();
  const result = runScan(repo);
  const elapsed = Date.now() - start;
  const secretFindings = result.findings.filter((f) => f.id.startsWith("secret-"));
  assert("no false positives in normal source", secretFindings.length === 0, `got ${secretFindings.length}`);
  assert("1000-line scan under 1s", elapsed < 1000, `took ${elapsed}ms`);
}

console.log("\n--- Negative: curl without auth should NOT trigger ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "scripts/ping.sh",
        content: 'curl https://example.com/health\ncurl -L -o out.html https://example.com\n',
      },
    ],
  });
  const result = runScan(repo);
  const curlFindings = result.findings.filter(
    (f) =>
      f.id.includes("curl-authorization-header") ||
      f.id.includes("curl-basic-auth-user"),
  );
  assert(
    "no curl-auth finding for plain curl commands",
    curlFindings.length === 0,
    `got ${curlFindings.length}: ${curlFindings.map((f) => f.id).join(", ")}`,
  );
}

console.log("\n--- Negative: short password should NOT trigger ---");
{
  const repo = makeRepo({
    files: [
      { path: "main.tf", content: 'password = "abc"\n' },
    ],
  });
  const result = runScan(repo);
  const tfPwdFindings = result.findings.filter((f) =>
    f.id.includes("hashicorp-terraform-password"),
  );
  assert(
    "short password value does not trigger TF-password rule",
    tfPwdFindings.length === 0,
    `got ${tfPwdFindings.length}`,
  );
}

console.log("\n--- Negative: similar-looking non-secrets should NOT trigger ---");
{
  const repo = makeRepo({
    files: [
      {
        path: "src/sample.ts",
        content: [
          'const almostLTAI = "LTAIxxxxxxxxxxxxxxxxxxxx=";',
          'const almostHf = "hf_short";',
          'const almostGh = "ghp_short";',
          'const almostNRAK = "NRAK-zzzzzzzzzzzzzzzzzzzzzzzzz";',
        ].join("\n") + "\n",
      },
    ],
  });
  const result = runScan(repo);
  const fpFindings = result.findings.filter(
    (f) =>
      f.id.includes("alibaba-accesskey-id") ||
      f.id.includes("new-relic-user-api-key"),
  );
  assert(
    "near-miss non-secrets do not trigger",
    fpFindings.length === 0,
    `got ${fpFindings.length}: ${fpFindings.map((f) => f.id).join(", ")}`,
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
