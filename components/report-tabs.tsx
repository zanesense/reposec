"use client";

import * as React from "react";
import {
  DoodleCheck,
  DoodleWrench,
  DoodleFile,
  DoodlePin,
  DoodleAlert,
  DoodleShield,
  Sparkle,
} from "@/components/doodles";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SecurityScore } from "@/components/security-score";
import { FindingCard } from "@/components/finding-card";
import { ExportButton, type ExportItem } from "@/components/export-button";
import { RiskBadge } from "@/components/risk-badge";
import { BAND_LABELS, groupBySeverity, SEVERITY_ORDER } from "@/lib/scoring";
import type {
  CheckResult,
  Finding,
  FindingCategory,
  ScanReport,
  Severity,
} from "@/lib/types";
import {
  generateEnvExampleTemplate,
  generateFixPrompt,
  generateIssueChecklist,
  generateJsonReport,
  generateMarkdownReport,
  generateSecurityMdTemplate,
} from "@/lib/exporters";

const SEV_COLOR: Record<Severity, string> = {
  critical: "text-red-700",
  high: "text-orange-700",
  medium: "text-yellow-700",
  low: "text-blue-700",
  info: "text-slate-700",
};

const SEV_BG: Record<Severity, string> = {
  critical: "bg-red-100",
  high: "bg-orange-100",
  medium: "bg-yellow-100",
  low: "bg-blue-100",
  info: "bg-slate-100",
};

const SEV_BAR: Record<Severity, string> = {
  critical: "bg-red-700",
  high: "bg-orange-700",
  medium: "bg-yellow-700",
  low: "bg-blue-700",
  info: "bg-slate-500",
};

const CATEGORY_LABEL: Record<FindingCategory, string> = {
  environment: "Environment & secrets",
  documentation: "Documentation",
  package: "Package & scripts",
  github: "GitHub features",
  secret: "Secret patterns",
  docker: "Container hygiene",
  community: "Community health",
  ci: "CI quality",
  metadata: "Repository metadata",
  code: "Source code patterns",
  dependencies: "Dependency hygiene",
};

const CHECK_STATUS_STYLE: Record<
  CheckResult["status"],
  { label: string; bg: string; text: string; border: string }
> = {
  pass: {
    label: "Pass",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    border: "border-emerald-700",
  },
  fail: {
    label: "Fail",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-700",
  },
  warn: {
    label: "Warn",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-700",
  },
  missing: {
    label: "Missing",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-700",
  },
  info: {
    label: "Info",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-500",
  },
  skip: {
    label: "Skip",
    bg: "bg-slate-100",
    text: "text-slate-500",
    border: "border-slate-400",
  },
};

export function ReportTabs({ report }: { report: ScanReport }) {
  const grouped = React.useMemo(
    () => groupBySeverity(report.findings),
    [report.findings],
  );
  const counts = SEVERITY_ORDER.map((s) => grouped[s].length);
  const total = report.findings.length;

  const exportItems = React.useMemo<ExportItem[]>(
    () => [
      {
        id: "report",
        label: "Markdown report",
        description: "Full security report with score, findings, fixes, and checks table.",
        content: generateMarkdownReport(report),
        filename: `reposec-${report.repo.owner}-${report.repo.repo}.md`,
        mime: "text/markdown",
      },
      {
        id: "json",
        label: "JSON report",
        description: "Full scan result as JSON, for CI pipelines or scripts.",
        content: generateJsonReport(report),
        filename: `reposec-${report.repo.owner}-${report.repo.repo}.json`,
        mime: "application/json",
      },
      {
        id: "security-md",
        label: "SECURITY.md template",
        description: "Drop-in vulnerability disclosure policy.",
        content: generateSecurityMdTemplate(),
        filename: "SECURITY.md",
        mime: "text/markdown",
      },
      {
        id: "env-example",
        label: ".env.example template",
        description: "Placeholder environment variables for contributors.",
        content: generateEnvExampleTemplate(),
        filename: ".env.example",
        mime: "text/plain",
      },
      {
        id: "issue",
        label: "GitHub issue checklist",
        description: "Paste into a new issue to track every finding.",
        content: generateIssueChecklist(report),
        filename: `reposec-issues-${report.repo.owner}-${report.repo.repo}.md`,
        mime: "text/markdown",
      },
      {
        id: "fix-prompt",
        label: "OpenCode / Codex fix prompt",
        description: "Hand the report to your coding agent for autonomous fixes.",
        content: generateFixPrompt(report),
        filename: "reposec-fix-prompt.md",
        mime: "text/markdown",
      },
    ],
    [report],
  );

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="flex w-full sm:w-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="findings">
          Findings
          {total > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-[2px] border-ink bg-marker px-1.5 text-[10px] font-bold text-ink">
              {total}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="fixes">Fixes</TabsTrigger>
        <TabsTrigger value="checks">Checks</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="export">Export</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
              <SecurityScore score={report.score} band={report.scoreBand} />
              <p className="rounded-full border-[2px] border-ink bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0_0_#1a1a1a]">
                Band: {BAND_LABELS[report.scoreBand]}
              </p>
            </CardContent>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            {SEVERITY_ORDER.map((severity, idx) => (
              <Card key={severity} className={severity === "critical" ? "border-red-700" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <RiskBadge severity={severity} />
                    <span
                      className={`font-display text-3xl font-bold ${SEV_COLOR[severity]}`}
                    >
                      {counts[idx]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {counts[idx] === 1 ? "finding" : "findings"} at this level
                  </p>
                  <div className={`mt-3 h-1.5 rounded-full ${SEV_BG[severity]}`}>
                    <div
                      className={`h-full rounded-full ${SEV_BAR[severity]}`}
                      style={{
                        width: `${total > 0 ? Math.min(100, (counts[idx] / total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <RepoMetaCard report={report} />

        <CategoryBreakdownCard report={report} />

        {report.summary.filesMissing.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoodleAlert
                  className="h-5 w-5 text-yellow-700"
                  aria-hidden="true"
                />
                Missing files ({report.summary.filesMissing.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {report.summary.filesMissing.map((file, i) => (
                  <code
                    key={file}
                    className="rounded-lg border-[2px] border-ink bg-muted px-2.5 py-1 font-mono text-xs font-semibold shadow-[2px_2px_0_0_#1a1a1a]"
                    style={{
                      transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
                    }}
                  >
                    {file}
                  </code>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="findings">
        {report.findings.length === 0 ? (
          <EmptyState
            title="No findings!"
            description="No rule-based issues were detected. Keep running RepoSec on every PR."
          />
        ) : (
          <div className="space-y-4">
            {SEVERITY_ORDER.flatMap((severity) =>
              grouped[severity].map((f) => (
                <FindingCard key={f.id} finding={f} />
              )),
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="fixes">
        {report.findings.length === 0 ? (
          <EmptyState
            title="Nothing to fix"
            description="There are no recommended fixes because there are no findings."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {report.findings.map((f) => (
              <FixCard key={f.id} finding={f} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="checks">
        <ChecksPanel report={report} />
      </TabsContent>

      <TabsContent value="files">
        <FilesPanel report={report} />
      </TabsContent>

      <TabsContent value="export">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exportItems.map((item) => (
            <ExportButton key={item.id} item={item} />
          ))}
        </div>
        <Card className="mt-6 border-ink">
          <CardContent className="flex items-start gap-3 p-4">
            <Sparkle className="mt-0.5 h-5 w-5 text-marker" aria-hidden="true" />
            <p className="text-sm text-ink/80">
              RepoSec never puts paid API keys in production. Use the OpenCode
              or Codex fix prompt with your own BYOK setup to keep secrets
              outside of the app.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function FixCard({ finding }: { finding: Finding }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge severity={finding.severity} />
          <DoodleWrench
            className="h-4 w-4 text-marker"
            aria-hidden="true"
          />
        </div>
        <h3 className="font-display text-xl font-bold leading-snug">
          {finding.title}
        </h3>
        <p className="text-sm text-ink/80">{finding.fix}</p>
        {finding.file && (
          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <DoodlePin className="h-3 w-3" aria-hidden="true" />
            {finding.file}
            {finding.line ? `:${finding.line}` : ""}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RepoMetaCard({ report }: { report: ScanReport }) {
  const r = report.repo;
  const facts: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Description", value: r.description?.trim() || "_(none)_" },
    {
      label: "Primary language",
      value: r.language ? (
        <code className="rounded-md border-[2px] border-ink bg-card px-1.5 py-0.5 font-mono text-xs">
          {r.language}
        </code>
      ) : (
        "_(not detected)_"
      ),
    },
    {
      label: "License",
      value: r.licenseSpdxId
        ? `${r.licenseSpdxId}${r.licenseName ? ` (${r.licenseName})` : ""}`
        : "_(not detected)_",
    },
    {
      label: "Default branch",
      value: <code className="font-mono">{r.defaultBranch}</code>,
    },
    {
      label: "Stats",
      value: `${(r.stars ?? 0).toLocaleString()} stars \u00B7 ${(r.forks ?? 0).toLocaleString()} forks \u00B7 ${(r.openIssues ?? 0).toLocaleString()} open issues`,
    },
    {
      label: "Size",
      value:
        typeof r.sizeKb === "number"
          ? `${(r.sizeKb / 1024).toFixed(2)} MB`
          : "_(unknown)_",
    },
    {
      label: "Last push",
      value: r.pushedAt ? new Date(r.pushedAt).toUTCString() : "_(unknown)_",
    },
  ];
  if (r.archived) facts.push({ label: "Status", value: "Archived" });
  if (r.isTemplate) facts.push({ label: "Type", value: "Template repository" });
  if (r.topics && r.topics.length > 0) {
    facts.push({
      label: "Topics",
      value: (
        <div className="flex flex-wrap gap-1.5">
          {r.topics.map((t) => (
            <code
              key={t}
              className="rounded-md border-[2px] border-ink bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold"
            >
              {t}
            </code>
          ))}
        </div>
      ),
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DoodleShield className="h-5 w-5 text-marker" aria-hidden="true" />
          Repository
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label} className="space-y-0.5">
              <dt className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                {f.label}
              </dt>
              <dd className="text-sm text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function CategoryBreakdownCard({ report }: { report: ScanReport }) {
  const entries = (Object.entries(report.summary.byCategory) as Array<
    [FindingCategory, { total: number; passed: number; failed: number }]
  >).filter(([, v]) => v.total > 0);
  if (entries.length === 0) return null;
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Checks by category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(([cat, v]) => {
          const ratio = v.total === 0 ? 0 : Math.round((v.passed / v.total) * 100);
          return (
            <div key={cat} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">
                  {CATEGORY_LABEL[cat]}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {v.passed} / {v.total} passed · {ratio}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border-[2px] border-ink bg-muted">
                <div
                  className={
                    v.failed === 0
                      ? "h-full bg-emerald-500"
                      : v.passed / v.total >= 0.6
                      ? "h-full bg-yellow-500"
                      : "h-full bg-red-500"
                  }
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ChecksPanel({ report }: { report: ScanReport }) {
  const checks = report.summary.checks;
  const counts: Record<CheckResult["status"], number> = {
    pass: 0,
    fail: 0,
    warn: 0,
    missing: 0,
    info: 0,
    skip: 0,
  };
  for (const c of checks) counts[c.status]++;

  const grouped = new Map<FindingCategory, CheckResult[]>();
  for (const c of checks) {
    if (!grouped.has(c.category)) grouped.set(c.category, []);
    grouped.get(c.category)!.push(c);
  }
  const orderedCategories = Array.from(grouped.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>Checks performed</span>
          <span className="font-mono text-xs text-muted-foreground">
            {report.summary.totalChecks} total · {report.summary.passed}{" "}
            passed · {report.summary.failed} failed
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {(["pass", "fail", "warn", "missing", "info", "skip"] as const).map(
            (status) =>
              counts[status] > 0 ? (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1.5 rounded-full border-[2px] px-2.5 py-0.5 text-[11px] font-bold ${
                    CHECK_STATUS_STYLE[status].border
                  } ${CHECK_STATUS_STYLE[status].bg} ${CHECK_STATUS_STYLE[status].text}`}
                >
                  {CHECK_STATUS_STYLE[status].label}: {counts[status]}
                </span>
              ) : null,
          )}
        </div>
        <div className="space-y-6">
          {orderedCategories.map((cat) => {
            const items = grouped.get(cat)!;
            return (
              <div key={cat}>
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABEL[cat]}
                </h3>
                <ul className="space-y-1.5">
                  {items.map((c) => {
                    const s = CHECK_STATUS_STYLE[c.status];
                    return (
                      <li
                        key={`${c.id}-${c.file ?? ""}-${c.line ?? 0}`}
                        className="flex flex-wrap items-start gap-3 rounded-lg border-[2px] border-ink bg-card px-3 py-2 shadow-[1.5px_1.5px_0_0_#1a1a1a]"
                      >
                        <span
                          className={`inline-flex h-6 min-w-[60px] items-center justify-center rounded-full border-[2px] px-2 text-[10px] font-bold uppercase ${s.border} ${s.bg} ${s.text}`}
                        >
                          {s.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.message}
                            {c.file ? (
                              <span className="font-mono">
                                {" "}
                                — <code>{c.file}</code>
                                {c.line ? `:${c.line}` : ""}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FilesPanel({ report }: { report: ScanReport }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Files with findings</CardTitle>
        </CardHeader>
        <CardContent>
          {report.fileGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No file-level findings.
            </p>
          ) : (
            <div className="space-y-4">
              {report.fileGroups.map((g) => (
                <div
                  key={g.path}
                  className="rounded-xl border-[2.5px] border-ink bg-card p-4 shadow-[2px_2px_0_0_#1a1a1a]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-sm font-bold">
                      <DoodleFile className="h-4 w-4 text-marker" aria-hidden="true" />
                      {g.path}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {SEVERITY_ORDER.filter((s) => g.counts[s] > 0).map((s) => (
                        <span
                          key={s}
                          className={`inline-flex items-center gap-1 rounded-full border-[2px] px-2 py-0.5 text-[10px] font-bold ${SEV_BG[s]} ${SEV_COLOR[s]} border-ink`}
                        >
                          {g.counts[s]} {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {g.findings.map((f) => (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-start gap-2"
                      >
                        <RiskBadge severity={f.severity} />
                        <span className="min-w-0 flex-1 text-ink">
                          {f.title}
                          {f.line ? (
                            <span className="font-mono text-xs text-muted-foreground">
                              {" "}
                              :{f.line}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>All files inspected</CardTitle>
        </CardHeader>
        <CardContent>
          {report.filesChecked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {report.filesChecked.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 rounded-lg border-[2px] border-ink bg-card px-3 py-2 font-mono text-xs font-semibold shadow-[2px_2px_0_0_#1a1a1a]"
                >
                  <DoodleCheck
                    className="h-4 w-4 text-accent"
                    aria-hidden="true"
                  />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="relative flex flex-col items-center gap-2 overflow-hidden p-12 text-center">
        <Sparkle
          className="absolute left-10 top-8 h-6 w-6 text-marker animate-wiggle"
          aria-hidden="true"
        />
        <Sparkle
          className="absolute right-12 top-14 h-5 w-5 text-accent animate-float-soft"
          aria-hidden="true"
        />
        <Sparkle
          className="absolute bottom-10 right-16 h-4 w-4 text-marker animate-pulse-soft"
          aria-hidden="true"
        />
        <Sparkle
          className="absolute bottom-14 left-12 h-5 w-5 text-accent animate-wiggle"
          aria-hidden="true"
        />
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] border-ink bg-accent text-accent-foreground shadow-[3px_3px_0_0_#1a1a1a] sticker-tilt-left">
          <DoodleCheck className="h-9 w-9" aria-hidden="true" />
        </div>
        <h3 className="font-display text-4xl font-bold">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
