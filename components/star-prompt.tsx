"use client";

import * as React from "react";
import { DoodleStar, DoodleGithub, Sparkle } from "@/components/doodles";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STAR_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/zanesense/reposec";
const SESSION_KEY = "reposec:starPromptSeen:session";

export function isStarPromptSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

export function markStarPromptSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

export function resetStarPromptSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

interface StarPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
  className?: string;
}

export function StarPrompt({
  open,
  onOpenChange,
  onDismiss,
  className,
}: StarPromptProps) {
  function close() {
    markStarPromptSeen();
    onDismiss?.();
    onOpenChange(false);
  }

  function handleStar() {
    markStarPromptSeen();
    onDismiss?.();
    if (typeof window !== "undefined") {
      window.open(STAR_URL, "_blank", "noopener,noreferrer");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} labelledBy="star-prompt-title" describedBy="star-prompt-body">
      <div
        className={cn(
          "mx-auto max-w-md rounded-2xl border-[2.5px] border-ink bg-card p-6 shadow-[6px_6px_0_0_#1a1a1a]",
          className,
        )}
      >
        <div className="flex items-start gap-4">
          <div className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-ink bg-highlight shadow-[2px_2px_0_0_#1a1a1a] sticker-tilt-left">
            <DoodleStar className="h-7 w-7 text-marker" aria-hidden="true" />
            <Sparkle
              className="absolute -right-2 -top-2 h-4 w-4 text-marker animate-wiggle"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-marker">
              Quick favor
            </p>
            <h2
              id="star-prompt-title"
              className="mt-1 font-display text-2xl font-bold leading-tight"
            >
              Star RepoSec on GitHub?
            </h2>
            <p
              id="star-prompt-body"
              className="mt-2 text-sm text-ink/80"
            >
              RepoSec is free, open source, and never modifies your repo. A
              star helps other developers find it.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>
            Maybe later
          </Button>
          <Button type="button" onClick={handleStar}>
            <DoodleGithub className="h-4 w-4" />
            Star on GitHub
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
