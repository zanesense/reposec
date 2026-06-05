# RepoSec

> Defensive GitHub repository security scanner. Find security gaps in your
> public GitHub repo before attackers do.

RepoSec is a static, read-only web app that scans a public GitHub
repository and generates a clear security report. It looks for exposed
`.env` files, missing `.env.example`, weak `.gitignore`, hardcoded secret
patterns, missing `SECURITY.md`, missing `CODEOWNERS`, missing
Dependabot and CI, weak README setup, Dockerfile misconfigurations,
permission scopes, and dependency hygiene issues.

This is a defensive tool. It does not modify your repository and does not
exfiltrate data.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 with the RepoSec design tokens
- **UI primitives:** shadcn-style components (locally authored, no CLI)
- **Icons:** Lucide
- **Toasts:** Sonner
- **Repo fetching:** GitHub REST API + raw file downloads (no auth required)
- **AI:** Not in the MVP. Optional layer planned for later (Bring Your Own Key).

## Project structure

```
app/
  page.tsx              Landing page
  scan/page.tsx         Scan-in-progress + result view
  report/page.tsx       Alias of scan that re-runs from query params
  api/scan/route.ts     Server-side scanner endpoint
  layout.tsx            Root layout (fonts, theme, nav, footer, toaster)
  globals.css           Tailwind v4 + RepoSec design tokens
  not-found.tsx         404
  loading.tsx           Global loading skeleton

components/
  navbar.tsx            Top navigation
  footer.tsx            Site footer
  repo-input.tsx        GitHub URL input with parsing + sample repos
  security-score.tsx    SVG score gauge
  finding-card.tsx      Severity-grouped finding card
  risk-badge.tsx        Severity badge
  report-tabs.tsx       Overview / Findings / Fixes / Checks / Files / Export tabs
  export-button.tsx     Copy + download button for an export item
  scan-view.tsx         Scan state machine + UI
  ui/                   shadcn-style primitives (button, card, input, badge, tabs, skeleton)

lib/
  github.ts             GitHub API client, URL parsing, error model
  rules.ts              Secret pattern catalog + severity helpers
  scanner.ts            Rule-based scanner (12 modules, per-check pass/fail tracking)
  scoring.ts            Score calculation and band assignment
  exporters.ts          Markdown report, JSON report, SECURITY.md, .env.example, issue checklist, fix prompt
  types.ts              Shared TypeScript types
  utils.ts              cn(), formatting, masking

public/
  favicon.svg           RepoSec shield favicon
  screenshots/          Captured Playwright screenshots of the live UI

design-system/
  reposec/              Persisted ui-ux-pro-max design system (MASTER.md)
```

## What gets checked

RepoSec runs 12 static check modules. Every check is read-only, runs
against the public GitHub API, and never mutates the target repository.

| Module                 | What it verifies                                                            |
| ---------------------- | --------------------------------------------------------------------------- |
| Environment & secrets  | Exposed `.env`, missing `.env.example`, `.gitignore` coverage, secret patterns |
| Documentation          | README setup, env vars and security sections, `SECURITY.md`, `LICENSE`     |
| Package & scripts      | `package.json` parses, `test` / `lint` / `audit` / `start` scripts present  |
| GitHub features        | `.github/workflows`, `.github/dependabot.yml`                               |
| Container hygiene      | Dockerfile `USER`, `HEALTHCHECK`, no `:latest`, no `EXPOSE 22`              |
| Community health       | Issue / PR templates, `CODEOWNERS`, code of conduct, contributing, changelog |
| CI quality             | Workflows trigger on `pull_request`, run tests, run audit, no `write-all`   |
| Repository metadata    | Description, topics, license, archived flag, default branch                |
| Source code patterns   | `eval()`, `new Function()`, `dangerouslySetInnerHTML`                        |
| Dependency hygiene     | `engines` field, `repository` field, single lockfile                        |
| Code heuristics        | 14 secret patterns: OpenAI, GitHub, AWS, Stripe, Slack, JWT, private keys, ... |

The full check table is included in the report and in the exported
markdown / JSON files.

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and paste a public GitHub URL, e.g.
`https://github.com/vercel/next.js`.

Optional: add a GitHub token to `.env.local` to raise the rate limit from
60 to 5000 requests per hour:

```bash
GITHUB_TOKEN=ghp_...
```

## Scripts

```bash
npm run dev      # start the dev server with Turbopack
npm run build    # production build
npm run start    # serve the production build
npm run lint     # run ESLint
```

## How a scan works

1. The user pastes a public GitHub URL.
2. The client posts `{ url }` to `/api/scan`.
3. The server validates the URL, calls the GitHub API for repo metadata,
   fetches the file tree, and downloads the files that matter.
4. A static, rule-based scanner produces a list of findings.
5. The score is calculated, findings are grouped by severity, and the
   client renders the report.
6. The user can copy or download a markdown report, a `SECURITY.md`
   template, an `.env.example` template, a GitHub issue checklist, or an
   OpenCode / Codex fix prompt.

The scanner is read-only and does not store anything. There is no
database, no auth, and no signup in the MVP.

## Screenshots

The flow is paste, scan, report. RepoSec runs a fixed set of static
checks against any public GitHub repository and returns a security score,
a per-category checks table, severity-grouped findings, and downloads.

**Landing page.** Paste a public GitHub URL, pick a sample, or open the
animated loader.

![RepoSec landing page with 12 check cards and sample repos to scan](public/screenshots/01-home-light.png)

**Scanning state.** While the API fetches the file tree and runs the
rules, you get an animated loader with a per-stage status line.

![RepoSec scan-in-progress loader with stage checklist](public/screenshots/02-scan-loading.png)

**Report overview.** A score gauge with band, a count by severity, a
repository metadata card, a category-by-category pass/fail breakdown,
and a list of missing files.

![RepoSec report overview with security score, metadata, and category breakdown](public/screenshots/03-report-overview.png)

**Findings tab.** Every finding as a sticker card with severity, masked
evidence, and a "Fix it like this" panel.

![RepoSec findings tab with severity cards and fix suggestions](public/screenshots/04-report-findings.png)

**Export tab.** One-click downloads for a markdown report, a JSON
report, a `SECURITY.md` template, a `.env.example`, a GitHub issue
checklist, or a fix prompt you can paste into your editor agent.

![RepoSec export tab with copy and download buttons for every artifact](public/screenshots/05-report-export.png)

The screenshots are regenerated with `npm run screenshots`, which builds
the app, serves it on port 4001, and captures each route with Playwright.

## Safe positioning

RepoSec is a **defensive** security tool. The copy and code in this
project is deliberately framed as:

- security scanner
- repo hygiene
- defensive security
- secure coding checklist
- secret leak detection
- dependency hygiene
- security report

We do not use language like "hack", "exploit", "bypass", or "steal".

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for the full plan and the 7-day MVP
build sequence.

## License

MIT.
