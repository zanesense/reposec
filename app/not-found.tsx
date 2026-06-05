import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Squiggle, DoodleAlert } from "@/components/doodles";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-ink bg-marker text-ink shadow-[3px_3px_0_0_#1a1a1a] sticker-tilt-left">
        <DoodleAlert className="h-9 w-9" aria-hidden="true" />
      </span>
      <p className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-marker">
        Error 404
      </p>
      <h1 className="mt-2 font-display text-5xl font-bold tracking-tight sm:text-6xl">
        Lost the <span className="squiggle-underline">plot</span>?
      </h1>
      <Squiggle className="mt-2 h-2 w-32 text-marker" />
      <p className="mt-4 max-w-md text-base text-ink/80">
        The page you were looking for is not here. Maybe it never existed,
        or it ran away to join the circus.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/">Take me home</Link>
      </Button>
    </div>
  );
}
