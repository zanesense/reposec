import { RepoInput } from "@/components/repo-input";
import { DoodleCheck, DoodleShield, Sparkle } from "@/components/doodles";

export default function ScannerPage() {
  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 pt-20 sm:px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border-[2.5px] border-ink bg-accent shadow-[3px_3px_0_0_#1a1a1a] sticker-tilt-left">
          <DoodleShield className="h-8 w-8 text-accent-foreground" />
        </div>
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-marker">
            Web scanner
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Scan a public repo right now
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-ink/80">
            Paste any public GitHub repository URL and get an instant security
            report. No signup, no install, no auth.
          </p>
        </div>
        <RepoInput />
        <div className="inline-flex items-center gap-2 rounded-full border-[2px] border-ink bg-card px-3 py-1.5 text-xs font-semibold shadow-[2px_2px_0_0_#1a1a1a]">
          <DoodleCheck className="h-4 w-4 text-accent" aria-hidden="true" />
          Read-only. We never modify your repository.
        </div>
      </div>
    </div>
  );
}
