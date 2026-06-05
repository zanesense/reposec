import http from "node:http";
import { fetchClientBundleFiles } from "../lib/client-bundle.ts";
import { runScan } from "../lib/scanner.ts";
import type { RepoData } from "../lib/types.ts";

process.env.REPOSEC_TEST_ALLOW_INSECURE_BUNDLE_SCAN = "1";

const fakeToken = "ghp_" + "A".repeat(36);

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end('<!doctype html><script src="/assets/app.js"></script>');
    return;
  }
  if (req.url === "/assets/app.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(`window.__CONFIG__ = { token: "${fakeToken}" };`);
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Test server did not bind to a TCP port.");
}

try {
  const files = await fetchClientBundleFiles(`http://127.0.0.1:${address.port}/`);
  const repo: RepoData = {
    metadata: {
      owner: "test",
      repo: "bundle",
      defaultBranch: "main",
      isPrivate: false,
      htmlUrl: "https://github.com/test/bundle",
    },
    files,
    fileTree: files.map((file) => file.path),
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
  };
  const result = runScan(repo);
  const hit = result.findings.find(
    (finding) =>
      finding.file?.startsWith("client-bundle/") &&
      finding.id.includes("github-token"),
  );
  if (!hit) {
    throw new Error("Expected client-bundle GitHub token finding.");
  }
  console.log("PASS client bundle token finding detected");
} finally {
  server.close();
}
