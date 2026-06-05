import Link from "next/link";
import { DoodleShield, Sparkle } from "@/components/doodles";

export function Navbar() {
  return (
    <header className="sticky top-3 z-40 w-full">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-2xl border-[2.5px] border-ink bg-card px-4 shadow-[4px_4px_0_0_#1a1a1a] sm:px-5">
        <Link
          href="/"
          className="group flex items-center gap-2.5 cursor-pointer"
          aria-label="RepoSec home"
        >
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border-[2.5px] border-ink bg-accent text-accent-foreground shadow-[2px_2px_0_0_#1a1a1a] transition-transform duration-200 group-hover:-rotate-6">
            <DoodleShield className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold tracking-tight">
              Repo
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-marker squiggle-underline">
              Sec
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="#how"
            className="hidden rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink/70 transition-colors duration-200 hover:text-ink sm:inline-block"
          >
            How it works
          </Link>
          <Link
            href="#features"
            className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink/70 transition-colors duration-200 hover:text-ink"
          >
            Checks
          </Link>
          <span className="hidden -rotate-3 rounded-full border-[2px] border-ink bg-highlight px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink shadow-[2px_2px_0_0_#1a1a1a] sm:inline-flex">
            <Sparkle className="h-3 w-3" aria-hidden="true" />
            Beta
          </span>
        </nav>
      </div>
    </header>
  );
}
