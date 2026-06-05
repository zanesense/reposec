"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ScoreBand } from "@/lib/types";
import { BAND_DESCRIPTIONS, BAND_LABELS } from "@/lib/scoring";
import { Sparkle } from "@/components/doodles";

const BAND_STYLES: Record<
  ScoreBand,
  { ring: string; text: string; glow: string; bg: string }
> = {
  excellent: {
    ring: "stroke-accent",
    text: "text-accent",
    glow: "",
    bg: "bg-accent/20",
  },
  good: {
    ring: "stroke-emerald-500",
    text: "text-emerald-600",
    glow: "",
    bg: "bg-emerald-100",
  },
  fair: {
    ring: "stroke-yellow-500",
    text: "text-yellow-700",
    glow: "",
    bg: "bg-yellow-100",
  },
  weak: {
    ring: "stroke-orange-500",
    text: "text-orange-700",
    glow: "",
    bg: "bg-orange-100",
  },
  critical: {
    ring: "stroke-red-500",
    text: "text-red-700",
    glow: "",
    bg: "bg-red-100",
  },
};

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = React.useState<number>(() => {
    if (typeof window === "undefined") return target;
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    return reduced ? target : 0;
  });
  const raf = React.useRef<number | null>(null);

  React.useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const start = performance.now();
    const initial = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(initial + (target - initial) * eased);
      setValue(next);
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);

  return value;
}

export function SecurityScore({
  score,
  band,
  size = 200,
  className,
}: {
  score: number;
  band: ScoreBand;
  size?: number;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, score));
  const dash = (safe / 100) * CIRCUMFERENCE;
  const styles = BAND_STYLES[band];
  const displayed = useCountUp(safe);
  const isCelebratory = band === "excellent" || band === "good";

  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center gap-2",
        className,
      )}
    >
      {isCelebratory && (
        <>
          <Sparkle
            className="absolute -left-4 -top-2 h-7 w-7 text-marker animate-float-soft"
            aria-hidden="true"
          />
          <Sparkle
            className="absolute -right-5 top-6 h-5 w-5 text-accent animate-wiggle"
            aria-hidden="true"
          />
          <Sparkle
            className="absolute -bottom-2 -right-2 h-6 w-6 text-marker animate-pulse-soft"
            aria-hidden="true"
          />
        </>
      )}
      <div
        className="relative rounded-full border-[3px] border-ink bg-card shadow-[4px_4px_0_0_#1a1a1a]"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 180 180"
          className="-rotate-90"
          role="img"
          aria-label={`Security score ${safe} out of 100`}
        >
          <circle
            cx="90"
            cy="90"
            r={RADIUS}
            strokeWidth="10"
            className="stroke-muted"
            fill="none"
            strokeLinecap="round"
          />
          <circle
            cx="90"
            cy="90"
            r={RADIUS}
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
            className={cn(
              "transition-[stroke-dashoffset] duration-700",
              styles.ring,
            )}
            style={{
              strokeDasharray: CIRCUMFERENCE,
              strokeDashoffset: CIRCUMFERENCE - dash,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-display text-6xl font-bold leading-none tabular-nums",
              styles.text,
            )}
          >
            {displayed}
          </span>
          <span className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            / 100
          </span>
        </div>
        <span
          className={cn(
            "absolute -top-3 -right-3 rotate-[14deg] rounded-full border-[2.5px] border-ink px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0_0_#1a1a1a]",
            styles.bg,
            styles.text,
          )}
        >
          {BAND_LABELS[band]}
        </span>
      </div>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        {BAND_DESCRIPTIONS[band]}
      </p>
    </div>
  );
}
