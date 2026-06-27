import { GitHubError, fetchRepoData, parseRepoUrl } from "@/lib/github";
import { runScan } from "@/lib/scanner";
import { calculateScore, scoreBand } from "@/lib/scoring";
import { fetchClientBundleFiles } from "@/lib/client-bundle";
import { verifyFindings } from "@/lib/verification";
import type { ScanReport } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  url?: string;
  siteUrl?: string;
  verify?: boolean;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = parseRepoUrl(body.url ?? "");
  if (!parsed) {
    return Response.json(
      {
        error:
          "Please paste a valid public GitHub URL, e.g. https://github.com/owner/repo",
      },
      { status: 400 },
    );
  }

  const started = Date.now();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      let step = 0;

      try {
        send({ type: "progress", step: step++, label: "Fetching repository metadata" });

        const repo = await fetchRepoData(parsed.owner, parsed.repo, () => {
          send({ type: "progress", step: step++, label: "Reading the file tree" });
          send({ type: "progress", step: step++, label: "Pulling important files" });
        });

        if (body.siteUrl) {
          send({ type: "progress", step: step++, label: "Checking deployed JavaScript bundles" });
        }
        const clientBundleFiles = await fetchClientBundleFiles(
          body.siteUrl || null,
        );
        if (clientBundleFiles.length > 0) {
          repo.files = [...repo.files, ...clientBundleFiles];
          repo.fileTree = [...repo.fileTree, ...clientBundleFiles.map((f) => f.path)];
        }

        send({ type: "progress", step: step++, label: "Running rule-based checks" });
        const shouldVerify = body.verify === true;
        const result = runScan(repo, { collectSecretCandidates: shouldVerify });
        if (shouldVerify) {
          send({ type: "progress", step: step++, label: "Scanning for secret patterns" });
          await verifyFindings(result.findings, result.secretCandidates);
        }

        send({ type: "progress", step: step++, label: "Scoring and grouping findings" });
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

        send({ type: "complete", report });
      } catch (err) {
        if (err instanceof GitHubError) {
          send({ type: "error", message: err.message, code: err.code });
        } else {
          const message =
            err instanceof Error ? err.message : "Unexpected error while scanning.";
          send({ type: "error", message, code: "unknown" });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
