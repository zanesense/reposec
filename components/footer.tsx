import Link from "next/link";
import { DoodleShield, Sparkle, Squiggle } from "@/components/doodles";

export function Footer() {
  return (
    <footer className="mt-20 px-4 pb-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl rounded-2xl border-[2.5px] border-ink bg-card px-6 py-10 shadow-[4px_4px_0_0_#1a1a1a] sm:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-[2px] border-ink bg-accent text-accent-foreground">
                <DoodleShield className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-display text-2xl font-bold">RepoSec</span>
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              A read-only GitHub repo security scanner. Static rules, no
              installs, no auth. Open source under MIT.
            </p>
          </div>
          <div className="space-y-3">
            <p className="font-display text-lg font-bold">Product</p>
            <ul className="space-y-2 text-sm text-ink/80">
              <li>
                <Link
                  href="#features"
                  className="transition-colors duration-200 hover:text-marker"
                >
                  Checks
                </Link>
              </li>
              <li>
                <Link
                  href="#how"
                  className="transition-colors duration-200 hover:text-marker"
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="/scanner"
                  className="transition-colors duration-200 hover:text-marker"
                >
                  Scan a repo
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="font-display text-lg font-bold">Promise</p>
            <ul className="space-y-2 text-sm text-ink/80">
              <li className="flex items-center gap-1.5">
                <Sparkle className="h-3.5 w-3.5 text-marker" aria-hidden="true" />
                Read-only, never mutates your repo
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkle className="h-3.5 w-3.5 text-marker" aria-hidden="true" />
                Public repos only, no auth required
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkle className="h-3.5 w-3.5 text-marker" aria-hidden="true" />
                Heuristics are transparent and masked
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t-2 border-dashed border-ink/30 pt-5">
          <Squiggle className="h-2 w-32 text-marker" aria-hidden="true" />
          <div className="mt-3 flex flex-col items-start justify-between gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <p>
              &copy; {new Date().getFullYear()} RepoSec. Defensive security for
              open source.
            </p>
            <p>Built on Next.js 16 and the public GitHub API.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
