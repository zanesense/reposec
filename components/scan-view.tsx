"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  DoodleAlert,
  DoodleCheck,
  DoodleExternal,
  DoodleGithub,
  DoodleLoader,
  DoodleRefresh,
  DoodleStar,
  DoodleFork,
} from "@/components/doodles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SecurityScore } from "@/components/security-score";
import { ReportTabs } from "@/components/report-tabs";
import { RepoInput } from "@/components/repo-input";
import type { ScanReport } from "@/lib/types";

type Status = "idle" | "scanning" | "done" | "error";

interface ErrorState {
  message: string;
  code?: string;
}

const STAGES = [
  "Fetching repository metadata",
  "Reading the file tree",
  "Pulling important files",
  "Running rule-based checks",
  "Scanning for secret patterns",
  "Scoring and grouping findings",
];

export function ScanView() {
  const params = useSearchParams();
  const ownerParam = params.get("owner") ?? "";
  const repoParam = params.get("repo") ?? "";
  const initialUrl =
    ownerParam && repoParam
      ? `https://github.com/${ownerParam}/${repoParam}`
      : "";

  const [url] = React.useState(initialUrl);
  const [status, setStatus] = React.useState<Status>(
    initialUrl ? "scanning" : "idle",
  );
  const [report, setReport] = React.useState<ScanReport | null>(null);
  const [error, setError] = React.useState<ErrorState | null>(null);
  const [stage, setStage] = React.useState(0);
  const stageTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (status === "scanning" && initialUrl) {
      runScan(initialUrl);
    }
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startProgress() {
    setStage(0);
    if (stageTimer.current) clearInterval(stageTimer.current);
    stageTimer.current = setInterval(() => {
      setStage((s) => Math.min(STAGES.length - 1, s + 1));
    }, 1100);
  }

  function stopProgress() {
    if (stageTimer.current) clearInterval(stageTimer.current);
    stageTimer.current = null;
  }

  async function runScan(target: string) {
    setStatus("scanning");
    setError(null);
    setReport(null);
    startProgress();
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError({ message: data.error ?? "Scan failed.", code: data.code });
        toast.error(data.error ?? "Scan failed.");
        return;
      }
      stopProgress();
      setStage(STAGES.length - 1);
      setReport(data.report as ScanReport);
      setStatus("done");
      toast.success("Scan complete!", {
        description: `Score ${data.report.score} / 100`,
      });
    } catch (err) {
      stopProgress();
      const message =
        err instanceof Error ? err.message : "Network error during scan.";
      setStatus("error");
      setError({ message });
      toast.error(message);
    }
  }

  function handleRetry() {
    if (url) {
      runScan(url);
    } else {
      setStatus("idle");
    }
  }

  if (status === "idle") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-12">
            <h2 className="font-display text-4xl font-bold tracking-tight">
              Scan a public repository
            </h2>
            <p className="max-w-md text-base text-muted-foreground">
              Paste a GitHub URL below. RepoSec reads the public files and
              returns a security score and a list of fixes.
            </p>
            <div className="w-full pt-2">
              <RepoInput />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "scanning") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <Card>
          <CardContent className="relative overflow-hidden p-8 sm:p-10">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-[2.5px] border-ink bg-accent text-accent-foreground shadow-[2px_2px_0_0_#1a1a1a]">
                <DoodleLoader className="h-6 w-6 animate-spin" />
              </span>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Running checks
                </p>
                <p className="font-display text-2xl font-bold leading-tight">
                  Scanning {url}
                </p>
              </div>
            </div>
            <ul className="mt-8 space-y-3">
              {STAGES.map((label, i) => {
                const done = i < stage;
                const active = i === stage;
                return (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-[2px] border-ink transition-colors duration-200 ${
                        done
                          ? "bg-accent text-accent-foreground shadow-[2px_2px_0_0_#1a1a1a]"
                          : active
                          ? "bg-highlight text-ink shadow-[2px_2px_0_0_#1a1a1a]"
                          : "bg-card text-muted-foreground"
                      }`}
                    >
                      {done ? (
                        <DoodleCheck className="h-4 w-4" aria-hidden="true" />
                      ) : active ? (
                        <DoodleLoader className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span className="font-display text-sm font-bold">
                          {i + 1}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        done || active
                          ? "font-bold text-ink"
                          : "text-muted-foreground"
                      }
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="relative mt-8 h-2 overflow-hidden rounded-full border-[2px] border-ink bg-card">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <Card className="border-red-700">
          <CardContent className="flex flex-col gap-4 p-8 sm:p-10">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-red-700 bg-red-100 text-red-700 shadow-[2px_2px_0_0_#1a1a1a]">
                <DoodleAlert className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Scanner tripped
                </p>
                <h2 className="font-display text-3xl font-bold">
                  {error?.code === "rate_limited"
                    ? "GitHub rate limit reached"
                    : "We couldn't run the scan"}
                </h2>
                <p className="mt-2 text-sm text-ink/80">{error?.message}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRetry}>
                <DoodleRefresh className="h-4 w-4" />
                Try again
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "done" && report) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <RepoHeader report={report} />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <SecurityScore
                score={report.score}
                band={report.scoreBand}
                size={200}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 sm:p-8">
              <h2 className="font-display text-3xl font-bold">
                Quick summary
              </h2>
              <p className="mt-2 text-sm text-ink/80">
                {report.findings.length === 0
                  ? "No findings were detected on the rule-based checks. Keep it that way by running RepoSec on every PR."
                  : `${report.findings.length} finding${
                      report.findings.length === 1 ? "" : "s"
                    } grouped by severity below. Tackle critical and high items first.`}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryStat
                  label="Scanned"
                  value={report.summary.filesChecked}
                />
                <SummaryStat
                  label="Missing"
                  value={report.summary.filesMissing.length}
                />
                <SummaryStat
                  label="Findings"
                  value={report.findings.length}
                />
                <SummaryStat
                  label="Duration"
                  value={`${(report.durationMs / 1000).toFixed(1)}s`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8">
          <ReportTabs report={report} />
        </div>
      </div>
    );
  }

  return null;
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border-[2px] border-ink bg-card p-3 shadow-[2px_2px_0_0_#1a1a1a]">
      <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function RepoHeader({ report }: { report: ScanReport }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-ink bg-card text-ink shadow-[3px_3px_0_0_#1a1a1a]">
          <DoodleGithub className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
            Repository
          </p>
          <h1 className="truncate font-display text-3xl font-bold tracking-tight">
            {report.repo.owner}
            <span className="text-muted-foreground"> / </span>
            <span className="squiggle-underline">{report.repo.repo}</span>
          </h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {typeof report.repo.stars === "number" && (
          <span className="inline-flex items-center gap-1 rounded-full border-[2px] border-ink bg-card px-2.5 py-1 font-bold shadow-[2px_2px_0_0_#1a1a1a]">
            <DoodleStar className="h-3 w-3" aria-hidden="true" />
            {report.repo.stars.toLocaleString()}
          </span>
        )}
        {typeof report.repo.forks === "number" && (
          <span className="inline-flex items-center gap-1 rounded-full border-[2px] border-ink bg-card px-2.5 py-1 font-bold shadow-[2px_2px_0_0_#1a1a1a]">
            <DoodleFork className="h-3 w-3" aria-hidden="true" />
            {report.repo.forks.toLocaleString()}
          </span>
        )}
        <a
          href={report.repo.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border-[2px] border-ink bg-card px-2.5 py-1 font-bold shadow-[2px_2px_0_0_#1a1a1a] transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted"
        >
          <DoodleExternal className="h-3 w-3" aria-hidden="true" />
          Open on GitHub
        </a>
      </div>
    </div>
  );
}
