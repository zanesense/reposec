import { NextResponse } from "next/server";
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
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = parseRepoUrl(body.url ?? "");
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Please paste a valid public GitHub URL, e.g. https://github.com/owner/repo",
      },
      { status: 400 },
    );
  }

  const started = Date.now();
  try {
    const repo = await fetchRepoData(parsed.owner, parsed.repo);
    const clientBundleFiles = await fetchClientBundleFiles(
      body.siteUrl ?? repo.metadata.homepageUrl,
    );
    if (clientBundleFiles.length > 0) {
      repo.files = [...repo.files, ...clientBundleFiles];
      repo.fileTree = [...repo.fileTree, ...clientBundleFiles.map((f) => f.path)];
    }
    const shouldVerify = body.verify === true;
    const result = runScan(repo, { collectSecretCandidates: shouldVerify });
    if (shouldVerify) {
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
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json(
        { error: err.message, code: err.code, status: err.status },
        { status: err.status === 404 ? 404 : 502 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Unexpected error while scanning.";
    return NextResponse.json(
      { error: message, code: "unknown", status: 500 },
      { status: 500 },
    );
  }
}
