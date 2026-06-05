import Link from "next/link";
import {
  DoodleArrow,
  DoodleBook,
  DoodleBug,
  DoodleCheck,
  DoodleKey,
  DoodleLock,
  DoodleMagnifier,
  DoodleShield,
  DoodleStar,
  DoodleWorkflow,
  Sparkle,
  Squiggle,
} from "@/components/doodles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RepoInput } from "@/components/repo-input";

type DoodleIcon = (props: { className?: string }) => React.ReactElement;

const CHECKS: Array<{
  icon: DoodleIcon;
  title: string;
  description: string;
  bg: string;
  tilt: string;
}> = [
  {
    icon: DoodleLock,
    title: "Exposed .env detection",
    description:
      "Finds committed .env, .env.local, and .env.production files with real values.",
    bg: "bg-red-100",
    tilt: "sticker-tilt-left",
  },
  {
    icon: DoodleBook,
    title: "Hygiene file checks",
    description:
      "Looks for README, LICENSE, SECURITY.md, .env.example, CHANGELOG, CONTRIBUTING, and CODEOWNERS so new contributors aren't lost.",
    bg: "bg-yellow-100",
    tilt: "sticker-tilt-right",
  },
  {
    icon: DoodleMagnifier,
    title: ".gitignore coverage",
    description:
      "Verifies that .env, node_modules, and build output are properly ignored.",
    bg: "bg-blue-100",
    tilt: "sticker-tilt-flat-l",
  },
  {
    icon: DoodleKey,
    title: "Secret pattern scan",
    description:
      "Heuristically detects OpenAI, GitHub, AWS, Stripe, JWT, private keys, and database URLs. Always masked.",
    bg: "bg-orange-100",
    tilt: "sticker-tilt-flat-r",
  },
  {
    icon: DoodleWorkflow,
    title: "Dependabot and CI quality",
    description:
      "Checks for .github/workflows, Dependabot config, that CI runs on pull_request, runs tests, and does not use permissions: write-all.",
    bg: "bg-emerald-100",
    tilt: "sticker-tilt-left",
  },
  {
    icon: DoodleMagnifier,
    title: "package.json scripts",
    description:
      "Looks for test, lint, audit, and start scripts. Also flags a missing `engines` field and `repository` field.",
    bg: "bg-sky-100",
    tilt: "sticker-tilt-right",
  },
  {
    icon: DoodleShield,
    title: "Dockerfile hardening",
    description:
      "Detects a missing USER directive, missing HEALTHCHECK, :latest base image, ADD with a URL, and EXPOSE 22.",
    bg: "bg-rose-100",
    tilt: "sticker-tilt-flat-l",
  },
  {
    icon: DoodleStar,
    title: "Community health files",
    description:
      "Checks for issue templates, a PR template, CODEOWNERS, a code of conduct, a changelog, and a contributing guide.",
    bg: "bg-violet-100",
    tilt: "sticker-tilt-flat-r",
  },
  {
    icon: DoodleCheck,
    title: "Repository metadata",
    description:
      "Verifies a description, topics, license on GitHub, the archived flag, and a sensible default branch.",
    bg: "bg-lime-100",
    tilt: "sticker-tilt-left",
  },
  {
    icon: DoodleBug,
    title: "Code pattern heuristics",
    description:
      "Flags use of eval(), new Function(), and dangerouslySetInnerHTML inside the source tree (skipping node_modules and build output).",
    bg: "bg-fuchsia-100",
    tilt: "sticker-tilt-right",
  },
  {
    icon: DoodleArrow,
    title: "Dependency hygiene",
    description:
      "Detects a single lockfile, an `engines` field, and a `repository` field. Mixed lockfiles break deterministic installs.",
    bg: "bg-amber-100",
    tilt: "sticker-tilt-flat-l",
  },
  {
    icon: DoodleWorkflow,
    title: "Lockfile consistency",
    description:
      "Warns when package-lock.json, yarn.lock, and pnpm-lock.yaml all live in the same repository.",
    bg: "bg-teal-100",
    tilt: "sticker-tilt-flat-r",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Paste a public GitHub URL",
    body: "Type or paste a github.com/owner/repo link. Private repos and bad URLs are caught early.",
    icon: DoodleMagnifier,
    bg: "bg-accent/30",
  },
  {
    n: "02",
    title: "RepoSec fetches the file tree",
    body: "We pull the public file tree and the files that matter, then run the rule-based scanner.",
    icon: DoodleWorkflow,
    bg: "bg-secondary",
  },
  {
    n: "03",
    title: "Get a clear report",
    body: "A security score, per-category check results, severity-grouped findings, and copy-pasteable fixes.",
    icon: DoodleCheck,
    bg: "bg-emerald-100",
  },
];

export default function Home() {
  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-10 sm:pt-16">
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-96 w-[640px] -translate-x-1/2 rounded-full bg-highlight/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-6 top-24 hidden lg:block"
          aria-hidden="true"
        >
          <Sparkle className="h-10 w-10 text-marker animate-float-soft" />
        </div>
        <div
          className="pointer-events-none absolute left-8 top-44 hidden lg:block"
          aria-hidden="true"
        >
          <DoodleStar className="h-8 w-8 text-marker animate-wiggle" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 pb-16 pt-10 text-center sm:px-6 sm:pt-16">
          <Badge
            variant="outline"
            className="mx-auto mb-6 border-[2px] border-ink bg-secondary font-bold shadow-[2px_2px_0_0_#1a1a1a]"
          >
            <Sparkle className="h-3 w-3" aria-hidden="true" />
            Read-only · Public repos · No signup
          </Badge>

          <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block">Find the gaps in your</span>
            <span className="block">
              <span className="squiggle-underline-green">GitHub repo</span>
            </span>
            <span className="block">before attackers do.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-ink/80 sm:text-lg">
            RepoSec runs a static, read-only scan against any public GitHub
            repository and returns a security score, a checks table, and a
            list of fixes. No installs, no agent, no auth.
          </p>

          <div className="mt-10 flex justify-center">
            <RepoInput />
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border-[2px] border-ink bg-card px-3 py-1.5 text-xs font-semibold shadow-[2px_2px_0_0_#1a1a1a]">
            <DoodleCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            Read-only. We never modify your repository.
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="mb-10 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-marker">
              What we check
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Twelve static checks, all read-only.
            </h2>
            <Squiggle className="mt-1 h-2 w-32 text-marker" />
            <p className="mt-3 max-w-xl text-base text-ink/80">
              Each check is a static, read-only rule. Every result is
              reproducible: re-run the scan and the output is identical.
            </p>
          </div>
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link href="#how">
              How it works
              <DoodleArrow className="h-5 w-5 doodle-arrow" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((c, i) => {
            const Icon = c.icon;
            return (
              <Card
                key={c.title}
                className={`group transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#1a1a1a] ${c.tilt}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="p-6">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border-[2.5px] border-ink shadow-[2px_2px_0_0_#1a1a1a] ${c.bg} transition-transform duration-200 group-hover:-rotate-6`}
                  >
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-bold leading-tight">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink/80">{c.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        id="how"
        className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-marker">
            How it works
          </p>
          <h2 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Three steps, no installs.
          </h2>
          <Squiggle className="mt-1 h-2 w-32 text-marker" />
          <p className="mt-3 text-base text-ink/80">
            RepoSec is a Next.js app that talks to the public GitHub API. No
            auth, no tokens, no agent, no signup.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.n}
                className={`relative overflow-hidden ${
                  i % 2 === 0 ? "sticker-tilt-flat-l" : "sticker-tilt-flat-r"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border-[2.5px] border-ink shadow-[2px_2px_0_0_#1a1a1a] ${step.bg}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-display text-3xl font-bold text-marker">
                      {step.n}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-bold leading-snug">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink/80">{step.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <Card className="relative overflow-hidden border-accent">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-highlight/40 blur-2xl"
            aria-hidden="true"
          />
          <CardContent className="relative grid gap-6 p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge
                variant="outline"
                className="mb-4 border-[2px] border-ink bg-secondary font-bold shadow-[2px_2px_0_0_#1a1a1a]"
              >
                <DoodleShield className="h-3 w-3" aria-hidden="true" />
                Defensive by design
              </Badge>
              <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Built for developers,{" "}
                <span className="highlight-marker-orange">not auditors</span>.
              </h2>
              <p className="mt-3 max-w-xl text-base text-ink/80">
                No black-box scoring, no upsells, no paid tiers. Get a markdown
                report, a JSON report, and a fix prompt for your coding agent
                in under a minute.
              </p>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {[
                  "Static, read-only scanning",
                  "Always-masked secret evidence",
                  "Transparent checks table",
                  "JSON export for CI pipelines",
                  "Copy-paste fixes and templates",
                  "Works with public repos only",
                ].map((line, i) => (
                  <li
                    key={line}
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[2px] border-ink bg-accent text-accent-foreground shadow-[1.5px_1.5px_0_0_#1a1a1a] ${
                        i % 2 === 0 ? "sticker-tilt-flat-l" : "sticker-tilt-flat-r"
                      }`}
                    >
                      <DoodleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <Button asChild size="xl">
                <Link href="#top">
                  Scan a repo
                  <DoodleArrow className="h-5 w-5 doodle-arrow" />
                </Link>
              </Button>
              <p className="text-xs font-semibold text-muted-foreground">
                Or paste a URL in the input above.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Card className="border-ink">
          <CardContent className="grid gap-4 p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border-[2.5px] border-ink bg-marker text-ink shadow-[3px_3px_0_0_#1a1a1a] sticker-tilt-left">
              <DoodleBug className="h-10 w-10" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-marker">
                Scope
              </p>
              <h3 className="font-display text-2xl font-bold leading-tight">
                This is a{" "}
                <span className="highlight-marker">defensive</span> tool.
              </h3>
              <p className="mt-2 text-sm text-ink/80">
                RepoSec reads public files only. It is meant to help you find
                gaps in your own repository, never to help you attack someone
                else&apos;s.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
