import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";
import { SEVERITY_LABELS } from "@/lib/rules";

const STYLES: Record<
  Severity,
  { bg: string; text: string; border: string; dot: string }
> = {
  critical: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-700",
    dot: "bg-red-700",
  },
  high: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-700",
    dot: "bg-orange-700",
  },
  medium: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-700",
    dot: "bg-yellow-700",
  },
  low: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-700",
    dot: "bg-blue-700",
  },
  info: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-500",
    dot: "bg-slate-500",
  },
};

export function RiskBadge({
  severity,
  className,
  showDot = true,
}: {
  severity: Severity;
  className?: string;
  showDot?: boolean;
}) {
  const s = STYLES[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-[2px] px-2.5 py-0.5 text-xs font-bold font-sans",
        s.bg,
        s.text,
        s.border,
        className,
      )}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            s.dot,
            severity === "critical" && "animate-pulse",
          )}
        />
      )}
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
