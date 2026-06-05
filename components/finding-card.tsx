import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/risk-badge";
import { DoodleAlert, DoodlePin, DoodleWrench } from "@/components/doodles";
import type { Finding } from "@/lib/types";

export function FindingCard({ finding }: { finding: Finding }) {
  const isUrgent = finding.severity === "critical";
  return (
    <Card
      className={
        isUrgent
          ? "border-red-700"
          : "border-ink"
      }
    >
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge severity={finding.severity} />
              <span className="rounded-full border-[2px] border-ink bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                {finding.category}
              </span>
              {finding.confidence && (
                <span className="rounded-full border-[2px] border-ink bg-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                  {finding.verified ? "verified" : `${finding.confidence} confidence`}
                </span>
              )}
            </div>
            <h3 className="font-display text-2xl font-bold leading-tight">
              {finding.title}
            </h3>
            {finding.file && (
              <div className="flex items-center gap-1.5 rounded-md border-[2px] border-ink bg-muted px-2 py-0.5 font-mono text-xs text-ink shadow-[1.5px_1.5px_0_0_#1a1a1a]">
                <DoodlePin className="h-3 w-3" aria-hidden="true" />
                <span>
                  {finding.file}
                  {finding.line ? `:${finding.line}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm text-ink/80">{finding.description}</p>

        {finding.evidence && (
          <div className="mt-3 overflow-hidden rounded-xl border-[2.5px] border-ink bg-paper-2 shadow-[2px_2px_0_0_#1a1a1a]">
            <div className="flex items-center justify-between border-b-[2px] border-ink bg-secondary px-3 py-1.5">
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
                <DoodleCopy className="h-3 w-3" aria-hidden="true" />
                Evidence (masked)
              </span>
              <span className="font-mono text-[10px] text-ink/60">safe</span>
            </div>
            <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-ink/80">
              {finding.evidence}
            </pre>
          </div>
        )}

        <div className="mt-4 rounded-xl border-[2.5px] border-ink bg-accent/20 p-3 shadow-[2px_2px_0_0_#1a1a1a]">
          <div className="mb-1 flex items-center gap-1.5">
            <DoodleWrench className="h-4 w-4 text-ink" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-ink">
              Fix it like this
            </span>
          </div>
          <p className="text-sm text-ink/90">{finding.fix}</p>
        </div>

        {isUrgent && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border-[2.5px] border-red-700 bg-red-100 p-3">
            <DoodleAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-red-700">
              Treat this as urgent. If the value is real, rotate it before
              merging any fix.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DoodleCopy({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8 V 6 a 2 2 0 0 0 -2 -2 H 6 a 2 2 0 0 0 -2 2 v 8 a 2 2 0 0 0 2 2 h 2" />
      </g>
    </svg>
  );
}
