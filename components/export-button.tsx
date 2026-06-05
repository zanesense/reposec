"use client";

import * as React from "react";
import { DoodleCopy, DoodleDownload } from "@/components/doodles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ExportItem {
  id: string;
  label: string;
  description: string;
  content: string;
  filename: string;
  mime: string;
}

interface ExportButtonProps {
  item: ExportItem;
  variant?: "card" | "row";
  onCopied?: () => void;
}

export function ExportButton({
  item,
  variant = "card",
  onCopied,
}: ExportButtonProps) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([item.content], { type: item.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (variant === "row") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border-[2.5px] border-ink bg-card p-3 shadow-[2px_2px_0_0_#1a1a1a]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{item.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            <DoodleCopy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleDownload}
          >
            <DoodleDownload className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border-[2.5px] border-ink bg-card p-4 shadow-[3px_3px_0_0_#1a1a1a] transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#1a1a1a]",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-ink bg-highlight text-ink shadow-[2px_2px_0_0_#1a1a1a] transition-transform duration-200 group-hover:-rotate-6">
          <DoodleCopy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold leading-tight">
            {item.label}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex-1"
        >
          <DoodleCopy className="h-3.5 w-3.5" />
          {copied ? "Copied!" : "Copy"}
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={handleDownload}
          className="flex-1"
        >
          <DoodleDownload className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </div>
  );
}
