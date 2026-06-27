"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DoodleArrow,
  DoodleGithub,
  DoodleLoader,
  Sparkle,
} from "@/components/doodles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarPrompt, isStarPromptSeen } from "@/components/star-prompt";
import { cn } from "@/lib/utils";
import { parseRepoUrl } from "@/lib/github";
import type { ParsedRepoUrl } from "@/lib/types";

const SAMPLE_REPOS = [
  "vercel/next.js",
  "facebook/react",
  "microsoft/TypeScript",
];

export function RepoInput({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [siteUrl, setSiteUrl] = React.useState("");
  const [verifySecrets, setVerifySecrets] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [starPromptOpen, setStarPromptOpen] = React.useState(false);
  const pendingParsedRef = React.useRef<ParsedRepoUrl | null>(null);
  const pendingSiteUrlRef = React.useRef("");
  const pendingVerifyRef = React.useRef(false);

  const parsedPreview = React.useMemo(() => parseRepoUrl(value), [value]);

  function startScan(
    parsed: ParsedRepoUrl,
    deployedUrl = siteUrl,
    verify = verifySecrets,
  ) {
    setLoading(true);
    const params = new URLSearchParams({
      owner: parsed.owner,
      repo: parsed.repo,
    });
    if (deployedUrl.trim()) params.set("site", deployedUrl.trim());
    if (verify) params.set("verify", "1");
    router.push(`/report?${params.toString()}`);
  }

  function handlePromptOpenChange(open: boolean) {
    setStarPromptOpen(open);
    if (!open) {
      const pending = pendingParsedRef.current;
      const pendingSiteUrl = pendingSiteUrlRef.current;
      const pendingVerify = pendingVerifyRef.current;
      pendingParsedRef.current = null;
      pendingSiteUrlRef.current = "";
      pendingVerifyRef.current = false;
      if (pending) startScan(pending, pendingSiteUrl, pendingVerify);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = parseRepoUrl(value);
    if (!parsed) {
      setError(
        "Hmm, that doesn't look like a GitHub URL. Try https://github.com/owner/repo",
      );
      return;
    }
    if (siteUrl.trim()) {
      try {
        const trimmedSite = siteUrl.trim();
        const parsedSite = new URL(
          /^[a-z][a-z0-9+.-]*:/i.test(trimmedSite)
            ? trimmedSite
            : `https://${trimmedSite}`,
        );
        if (parsedSite.protocol !== "https:") {
          setError("Use an https:// URL for deployed bundle scanning.");
          return;
        }
      } catch {
        setError("That deployed app URL is not valid.");
        return;
      }
    }
    if (!isStarPromptSeen()) {
      pendingParsedRef.current = parsed;
      pendingSiteUrlRef.current = siteUrl.trim();
      pendingVerifyRef.current = verifySecrets;
      setStarPromptOpen(true);
      return;
    }
    startScan(parsed);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={cn("w-full", compact ? "max-w-2xl" : "max-w-2xl")}
        noValidate
      >
        <div
          className={cn(
            "group relative flex flex-col gap-3 rounded-2xl border-[2.5px] border-ink bg-card p-2 shadow-[4px_4px_0_0_#1a1a1a] transition-shadow duration-200",
            "hover:shadow-[6px_6px_0_0_#1a1a1a] focus-within:shadow-[6px_6px_0_0_#1a1a1a]",
            error && "border-red-700",
          )}
        >
          <div className="flex items-center gap-2 px-3 pt-2 text-xs text-muted-foreground">
            <DoodleGithub className="h-4 w-4" aria-hidden="true" />
            <span className="font-mono">github.com/</span>
            {parsedPreview ? (
              <span className="font-mono text-ink">
                {parsedPreview.owner}/{parsedPreview.repo}
              </span>
            ) : (
              <span className="font-mono text-muted-foreground/60">
                owner/repo
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <label htmlFor="repo-url" className="sr-only">
              GitHub repository URL
            </label>
            <Input
              id="repo-url"
              name="repo-url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://github.com/owner/repo"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              className="h-12 flex-1 border-0 bg-transparent text-base shadow-none focus-visible:shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="h-12 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <DoodleLoader className="h-4 w-4 animate-spin" />
                  Scanning
                </>
              ) : (
                <>
                  Scan now
                  <DoodleArrow className="h-5 w-5 doodle-arrow" />
                </>
              )}
            </Button>
          </div>
          <div className="border-t-[2px] border-dashed border-ink/30 px-3 py-2">
            <label
              htmlFor="site-url"
              className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Deployed app URL
            </label>
            <Input
              id="site-url"
              name="site-url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://your-app.example.com"
              value={siteUrl}
              onChange={(e) => {
                setSiteUrl(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              className="mt-1 h-10 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:shadow-none focus-visible:ring-0"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 px-3 pb-2 text-left text-xs text-ink/80">
            <input
              type="checkbox"
              checked={verifySecrets}
              onChange={(e) => setVerifySecrets(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 accent-current"
            />
            <span>
              <span className="font-bold text-ink">Verify supported secrets</span>
              <span className="block text-muted-foreground">
                Opt-in live checks for GitHub, Stripe, and HuggingFace tokens.
              </span>
            </span>
          </label>
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border-2 border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border-[2px] border-ink bg-highlight px-2.5 py-0.5 font-bold text-ink shadow-[2px_2px_0_0_#1a1a1a]">
              <Sparkle className="h-3 w-3" aria-hidden="true" />
              Try a sample
            </span>
            {SAMPLE_REPOS.map((repo) => (
              <button
                type="button"
                key={repo}
                onClick={() => setValue(`https://github.com/${repo}`)}
                className="cursor-pointer rounded-full border-[2px] border-ink bg-card px-2.5 py-0.5 font-mono text-xs text-ink shadow-[2px_2px_0_0_#1a1a1a] transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted"
              >
                {repo}
              </button>
            ))}
          </div>
        )}
      </form>
      <StarPrompt
        open={starPromptOpen}
        onOpenChange={handlePromptOpenChange}
      />
    </>
  );
}
