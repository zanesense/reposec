import { runScan } from "../lib/scanner.ts";
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
