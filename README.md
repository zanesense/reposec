# RepoSec

> **Find the security gaps in your public GitHub repo — before attackers do.**

RepoSec is a defensive, read-only scanner that audits a public GitHub repository and returns a clear, prioritized security report. It checks for exposed `.env` files, missing `.gitignore` rules, hardcoded secret patterns, missing `SECURITY.md` and `CODEOWNERS`, weak CI, Dockerfile misconfigurations, dependency hygiene, and more.

The scanner **never modifies** the target repository and **never exfiltrates** its data. It is a hygiene tool, not an offensive one.

<p align="left">
  <a href="https://github.com/zanesense/reposec/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" /></a>
  <a href="https://github.com/zanesense/reposec"><img alt="Version" src="https://img.shields.io/badge/version-0.1.0-6366f1?style=for-the-badge" /></a>
  <a href="https://github.com/zanesense/reposec/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/zanesense/reposec?style=for-the-badge&color=facc15" /></a>
  <a href="https://github.com/zanesense/reposec/issues"><img alt="Issues" src="https://img.shields.io/github/issues/zanesense/reposec?style=for-the-badge&color=f97316" /></a>
  <a href="https://github.com/zanesense/reposec/pulls"><img alt="PRs" src="https://img.shields.io/github/issues-pr/zanesense/reposec?style=for-the-badge&color=38bdf8" /></a>
  <img alt="Language" src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Framework" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white" />
  <img alt="Last commit" src="https://img.shields.io/github/last-commit/zanesense/reposec?style=for-the-badge" />
</p>

---

## 📖 Overview

Most repository leaks do not start with a sophisticated exploit. They start with **a committed `.env`, a missing `SECURITY.md`, or a CI workflow with `write-all` permissions**. RepoSec is a fast, opinionated linter for your repository's public surface: paste a GitHub URL, get a security score, a category-by-category pass/fail breakdown, severity-grouped findings, and copy-pasteable fixes.

It is built for:

- 🧑‍💻 **Maintainers** who want a quick hygiene check before tagging a release.
- 🛡️ **Security engineers** who need a free, no-signup pre-audit for open-source projects.
- 📚 **Educators and students** who want to teach the basics of repo hardening with a live report.
- 🤖 **LLM-assisted workflows** — every finding ships with a fix prompt you can paste into your editor agent.

Why a defensive tool? Because catching mistakes early is cheaper, friendlier, and more effective than chasing them after a leak. RepoSec is intentionally framed as a **scanner**, not an exploit kit.

---

## ✨ Features

- 🔍 **12 static check modules** covering env hygiene, secrets, docs, scripts, GitHub features, container hygiene, community health, CI quality, repo metadata, source patterns, and dependencies.
- 🧠 **14 secret patterns** out of the box: OpenAI, GitHub (classic + fine-grained), Slack, Stripe (live + test), Google API, AWS access keys, private key blocks, generic JWTs, database URLs, and generic credential assignments.
- 📊 **Security score (0–100)** with bands: _Excellent_, _Good_, _Fair_, _Weak_, _Critical_.
- 🗂️ **Per-category breakdown** showing exactly which checks passed, failed, warned, or were missing.
- 🧾 **Severity-grouped findings** with masked evidence and a "Fix it like this" panel.
- 📥 **One-click exports** for:
  - Markdown report
  - JSON report
  - `SECURITY.md` template
  - `.env.example` template
  - GitHub issue checklist
  - LLM fix prompt
- 🌗 **Polished UI** with a RepoSec design system, light/dark theming, and accessible shadcn-style primitives.
- 🧪 **Read-only by design** — no writes, no auth, no database, no telemetry beyond the GitHub API.
- 🐢 **No GitHub auth required** for public repos. Optional token raises the rate limit to 5000 req/h.

---

## 🧠 How It Works

RepoSec is a server-rendered Next.js application. The browser is a thin client; the real work happens in `app/api/scan/route.ts`.

```mermaid
flowchart TD
    A[User pastes a public GitHub URL] --> B[Client posts to /api/scan]
    B --> C[Server parses owner/repo]
    C --> D[GitHub REST API: repo metadata]
    D --> E[GitHub tree API: file tree]
    E --> F[Fetch important files: README, .env*, Dockerfile, workflows, ...]
    F --> G[Rule-based scanner: 12 modules]
    G --> H[Score calculation: 100 minus weighted findings]
    H --> I[ScanReport JSON]
    I --> J[Client renders score, tabs, findings]
    J --> K[Exports: Markdown, JSON, SECURITY.md, .env.example, issue checklist, fix prompt]
```

Key design choices:

- **Server-side fetching** keeps the GitHub token (if any) out of the browser and avoids CORS surprises.
- **Static rule engine** in `lib/scanner.ts` — easy to extend, deterministic, easy to test.
- **No persistence**: a scan is a single request/response cycle. There is no database to leak.

---

## 🗂️ Repository Structure

```text
reposec/
├── app/
│   ├── layout.tsx                # Root layout: fonts, theme, nav, footer, toaster
│   ├── page.tsx                  # Landing page with sample repos
│   ├── globals.css               # Tailwind v4 + RepoSec design tokens
│   ├── loading.tsx               # Global loading skeleton
│   ├── not-found.tsx             # Custom 404
│   ├── scan/page.tsx             # Scan-in-progress + result view
│   ├── report/page.tsx           # Alias of /scan, re-runs from query params
│   └── api/scan/route.ts         # Server-side scanner endpoint
│
├── components/
│   ├── navbar.tsx                # Top navigation
│   ├── footer.tsx                # Site footer
│   ├── repo-input.tsx            # GitHub URL input + sample repos
│   ├── security-score.tsx        # SVG score gauge with band
│   ├── finding-card.tsx          # Severity-grouped finding card
│   ├── risk-badge.tsx            # Severity badge
│   ├── report-tabs.tsx           # Overview / Findings / Fixes / Checks / Files / Export
│   ├── export-button.tsx         # Copy + download for one export item
│   ├── scan-view.tsx             # Scan state machine + UI
│   ├── star-prompt.tsx           # Friendly star CTA
│   ├── doodles.tsx               # Decorative SVG illustrations
│   └── ui/                       # shadcn-style primitives (button, card, input, badge, tabs, skeleton, dialog)
│
├── lib/
│   ├── github.ts                 # GitHub API client, URL parsing, error model
│   ├── rules.ts                  # Secret pattern catalog + severity helpers
│   ├── scanner.ts                # Rule-based scanner (12 modules, per-check pass/fail)
│   ├── scoring.ts                # Score calculation and band assignment
│   ├── exporters.ts              # Markdown / JSON / SECURITY.md / .env.example / issue checklist / fix prompt
│   ├── types.ts                  # Shared TypeScript types
│   └── utils.ts                  # cn(), formatters, secret masking
│
├── public/
│   ├── favicon.svg               # RepoSec shield favicon
│   └── screenshots/              # Captured Playwright screenshots of the live UI
│
├── scripts/
│   └── capture-screenshots.mjs   # Playwright screenshot pipeline (npm run screenshots)
│
├── .env.example                  # Template for optional GITHUB_TOKEN
├── eslint.config.mjs             # ESLint 9 + Next + TypeScript configs
├── next.config.ts                # Next.js config
├── postcss.config.mjs            # Tailwind v4 PostCSS plugin
├── tsconfig.json                 # Strict TypeScript config
├── package.json                  # Scripts and dependencies
└── README.md                     # You are here
```

> **TODO:** Add a top-level `LICENSE` file. The current `.gitignore` does not exclude it, and the project is shipped as MIT.

---

## 📦 Technologies

| Layer            | Choice                                                                              |
| ---------------- | ----------------------------------------------------------------------------------- |
| Framework        | [Next.js 16](https://nextjs.org/) (App Router)                                      |
| Language         | [TypeScript 5](https://www.typescriptlang.org/) (strict mode)                       |
| UI runtime       | [React 19](https://react.dev/)                                                      |
| Styling          | [Tailwind CSS v4](https://tailwindcss.com/) + RepoSec design tokens                 |
| UI primitives    | shadcn-style components, locally authored (no CLI dependency)                       |
| Icons            | [Lucide](https://lucide.dev/)                                                       |
| Toasts           | [Sonner](https://sonner.emilkowal.ski/)                                             |
| Class utilities  | `clsx`, `tailwind-merge`, `class-variance-authority`                                |
| Animations       | `tw-animate-css`                                                                    |
| Data source      | GitHub REST API + raw file downloads (no auth required)                             |
| Visual regression| [Playwright](https://playwright.dev/) (screenshot capture script)                   |
| Linting          | ESLint 9 + `eslint-config-next` (core-web-vitals + typescript)                      |
| Type checking    | `tsc --noEmit`                                                                      |

---

## ✅ Requirements

- **Node.js** ≥ 18.18 (Node 20 LTS recommended)
- **npm** ≥ 9 (or any compatible package manager: pnpm, yarn, bun)
- A modern browser (the UI uses CSS `:has()`, color-mix, and modern flex/grid)
- **Optional:** a GitHub personal access token for higher rate limits

> No database, no Docker, no cloud account required for the MVP.

---

## 🚀 Installation

```bash
# 1. Clone the repository
git clone https://github.com/zanesense/reposec.git
cd reposec

# 2. Install dependencies
npm install

# 3. (Optional) Set up environment variables
cp .env.example .env.local
# then edit .env.local and add your GITHUB_TOKEN

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000> and paste a public GitHub URL, e.g. `https://github.com/vercel/next.js`.

### Production build

```bash
npm run build
npm run start
```

---

## 🔧 Configuration

RepoSec is configured entirely through environment variables. There are no config files to edit and no database to provision.

| Variable       | Description                                                                                     | Required | Example       |
| -------------- | ----------------------------------------------------------------------------------------------- | -------- | ------------- |
| `GITHUB_TOKEN` | Personal access token (classic or fine-grained, public repos only). Raises rate limit to 5000/h. | No       | `ghp_xxx...`  |

Create a local `.env.local` (or `.env`) from the template:

```bash
cp .env.example .env.local
```

If you skip this step, the scanner still works — you just share the 60 req/h anonymous rate limit. Rate-limit hits surface as a friendly error in the UI, courtesy of the `GitHubError` model in `lib/github.ts:54`.

---

## 🛠️ Usage

### Web UI

1. Run `npm run dev` and open <http://localhost:3000>.
2. Paste a public GitHub URL (or pick a sample repo).
3. Watch the per-stage loader (metadata → tree → files → rules → score).
4. Explore the report tabs:
   - **Overview** — score gauge, severity counts, repo metadata, category breakdown.
   - **Findings** — every finding as a card with masked evidence and a "Fix it like this" panel.
   - **Fixes** — consolidated checklist.
   - **Checks** — full per-check pass/fail/warn table.
   - **Files** — file-grouped view of findings.
   - **Export** — copy or download the artifacts.

### Programmatic API

The scanner is exposed as a single POST endpoint:

```http
POST /api/scan
Content-Type: application/json

{
  "url": "https://github.com/vercel/next.js"
}
```

Successful response:

```json
{
  "ok": true,
  "report": {
    "repo": { "owner": "vercel", "repo": "next.js", "defaultBranch": "canary", "isPrivate": false },
    "score": 86,
    "scoreBand": "good",
    "summary": { "totalChecks": 42, "passed": 36, "failed": 4, "totalFindings": 6, "...": "..." },
    "findings": [ { "id": "...", "title": "...", "severity": "high", "category": "secret", "...": "..." } ],
    "scannedAt": "2026-06-05T08:00:00.000Z",
    "durationMs": 1480
  }
}
```

Error responses use stable `code` values: `not_found`, `private`, `rate_limited`, `invalid`, `unknown`.

### Screenshots

**Landing page**

![RepoSec landing page](public/screenshots/01-home-light.png)

**Scanning state**

![RepoSec scan-in-progress loader](public/screenshots/02-scan-loading.png)

**Report overview**

![RepoSec report overview](public/screenshots/03-report-overview.png)

**Findings tab**

![RepoSec findings tab](public/screenshots/04-report-findings.png)

**Export tab**

![RepoSec export tab](public/screenshots/05-report-export.png)

To regenerate them: `npm run screenshots` (builds the app, serves it on port 4001, and captures each route with Playwright).

---

## 🧪 Testing

The MVP ships with a screenshot-driven visual baseline and a strict type/lint pipeline. There is no unit test framework wired up yet.

```bash
# Type check (strict TypeScript)
npm run typecheck

# Lint (ESLint 9 + Next + TypeScript)
npm run lint

# Build the production bundle (catches many runtime issues at build time)
npm run build

# Regenerate the public/screenshots/ baseline
npm run screenshots

# Wipe build artifacts and the TS incremental cache
npm run clean
```

> **TODO:** Add a unit test framework (suggested: [Vitest](https://vitest.dev/) for the rule engine in `lib/scanner.ts` and `lib/rules.ts`).

---

## 📊 Project Flow

End-to-end scan lifecycle:

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web UI (Next.js client)
    participant A as /api/scan (Next.js server)
    participant G as GitHub REST API
    participant R as Rule engine (lib/scanner.ts)
    participant S as Scoring (lib/scoring.ts)

    U->>W: Paste a public GitHub URL
    W->>A: POST { url }
    A->>G: GET /repos/{owner}/{repo}
    G-->>A: Repo metadata
    A->>G: GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
    G-->>A: File tree
    A->>G: GET raw files (README, .env*, Dockerfile, workflows, ...)
    G-->>A: File contents
    A->>R: runScan(repoData)
    R-->>A: findings + summary + checks
    A->>S: calculateScore(findings)
    S-->>A: score + band
    A-->>W: { ok: true, report }
    W-->>U: Render score, tabs, exports
```

---

## 📚 API Reference

### `POST /api/scan`

Validates a public GitHub URL, fetches repo data, runs the static scanner, and returns a `ScanReport`.

**Request body**

| Field | Type   | Required | Description                                |
| ----- | ------ | -------- | ------------------------------------------ |
| `url` | string | yes      | Full public GitHub URL, e.g. `https://github.com/owner/repo`. Trailing slashes and `.git` suffixes are tolerated. |

**Response (200)**

```ts
interface ScanResponse {
  ok: true;
  report: ScanReport;
}
```

Where `ScanReport` is defined in `lib/types.ts:110` and includes `repo`, `score`, `scoreBand`, `summary`, `findings`, `filesChecked`, `fileGroups`, `scannedAt`, and `durationMs`.

**Error responses**

| Status | `code`         | Meaning                                                       |
| ------ | -------------- | ------------------------------------------------------------- |
| 400    | —              | Invalid JSON body or unparseable URL.                         |
| 404    | `not_found`    | The repository does not exist or is not public.               |
| 502    | `rate_limited` | GitHub rate limit reached (anonymous or token).               |
| 502    | `private`      | The repository is private or access is restricted.            |
| 500    | `unknown`      | Unexpected server error.                                      |

Example error body:

```json
{
  "error": "API rate limit exceeded for your IP.",
  "code": "rate_limited",
  "status": 403
}
```

---

## 🧩 Examples

### Try these public repositories

| Repository | Why scan it                                  |
| ---------- | -------------------------------------------- |
| `vercel/next.js` | Large, well-run project — should score in the _Good_ band. |
| `facebook/react` | Tests CI and metadata heuristics at scale. |
| `expressjs/express` | Classic Node.js project — interesting `.gitignore` and CI behavior. |

### What a finding looks like

```json
{
  "id": "secret-stripe-live",
  "title": "Stripe live secret key",
  "description": "Looks like a live Stripe secret key. Roll the key if real.",
  "severity": "critical",
  "category": "secret",
  "file": "src/config.ts",
  "line": 12,
  "evidence": "sk_l_********************def0",
  "fix": "Move the key to an environment variable and reference it via process.env.",
  "fixPrompt": "In src/config.ts:12, replace the hardcoded Stripe key with an env var..."
}
```

The scanner masks secrets to `prefix****suffix` before they ever leave the server, so the UI never displays the raw value.

---

## 🚢 Deployment

RepoSec is a standard Next.js 16 app. It works on any platform that supports the Node.js runtime.

### Vercel (recommended)

```bash
# Install the Vercel CLI if you don't have it
npm i -g vercel

# Deploy from the project root
vercel
```

Add `GITHUB_TOKEN` as an environment variable in the Vercel project settings if you want a higher rate limit.

### Docker

> **TODO:** A Dockerfile is not yet committed. The recommended shape is:
>
> ```Dockerfile
> # syntax=docker/dockerfile:1
> FROM node:20-alpine AS deps
> WORKDIR /app
> COPY package.json package-lock.json ./
> RUN npm ci
>
> FROM node:20-alpine AS builder
> WORKDIR /app
> COPY --from=deps /app/node_modules ./node_modules
> COPY . .
> RUN npm run build
>
> FROM node:20-alpine AS runner
> WORKDIR /app
> ENV NODE_ENV=production
> COPY --from=builder /app/.next ./.next
> COPY --from=builder /app/public ./public
> COPY --from=builder /app/package.json ./package.json
> COPY --from=builder /app/node_modules ./node_modules
> EXPOSE 3000
> CMD ["npm", "run", "start"]
> ```

### Self-hosted Node

```bash
npm run build
GITHUB_TOKEN=ghp_xxx npm run start
```

The server listens on port `3000` by default. Override with `PORT=4000 npm run start`.

---

## 🧭 Roadmap

Planned and aspirational improvements:

- 🧠 **Optional LLM layer** — "Bring Your Own Key" provider to add narrative remediation to the report.
- 🧪 **Unit tests** — Vitest coverage for `lib/scanner.ts`, `lib/rules.ts`, and `lib/scoring.ts`.
- 🐳 **Container hardening** — committed `Dockerfile` and `docker-compose.yml`.
- 🌐 **i18n** — multi-language report exports.
- 🔌 **GitHub App mode** — comment the report on PRs via a public GitHub App.
- 📦 **More ecosystems** — Python (`requirements.txt`, `pyproject.toml`), Go (`go.mod`), Rust (`Cargo.toml`) lockfile and audit checks.
- 🪝 **Webhooks** — scheduled scans for the repos you watch.
- 🪪 **License detection** — extend SPDX detection beyond the GitHub API metadata.

> **TODO:** A separate `ROADMAP.md` is not currently checked in. The list above is the source of truth until it is.

---

## 🤝 Contributing

Contributions are very welcome — especially new secret patterns and new check modules.

1. **Fork** the repository on GitHub.
2. **Clone** your fork and create a feature branch:
   ```bash
   git checkout -b feat/add-discord-token-pattern
   ```
3. **Install** dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
4. **Make your changes.** When adding a new secret pattern, edit `lib/rules.ts:10` and follow the existing `SecretPattern` shape.
5. **Run the quality checks** before committing:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```
6. **Commit** with a descriptive message:
   ```bash
   git commit -m "feat(scanner): add Discord bot token pattern"
   ```
7. **Push** your branch and open a **pull request** against `main`:
   ```bash
   git push origin feat/add-discord-token-pattern
   ```

Please open an issue first if your change is large or design-related.

---

## 📝 Changelog

> **TODO:** A `CHANGELOG.md` is not yet committed. Notable milestones to seed it with:

- **0.1.0** — Initial MVP. Landing page, 12 check modules, 14 secret patterns, score + band, exports (Markdown, JSON, `SECURITY.md`, `.env.example`, issue checklist, fix prompt), Playwright screenshot baseline.

---

## 🐛 Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `API rate limit exceeded` on the first scan | Anonymous GitHub limit (60 req/h) was hit. | Add `GITHUB_TOKEN` to `.env.local` and restart the dev server. |
| `Repository not found` for a repo you can see in the browser | The URL is wrong, the repo is private, or it was renamed. | Double-check the URL. RepoSec only scans public repos. |
| Scan returns 0 findings and a perfect score | The repo is small or has no scannable files (yet). | Try a larger public repo, e.g. `vercel/next.js`. |
| `.env.local` is missing after `cp .env.example .env.local` on Windows PowerShell | `cp` is not a native cmdlet. | Use `Copy-Item .env.example .env.local` instead. |
| `npm run screenshots` fails | Playwright browsers are not installed. | Run `npx playwright install` once before the first capture. |
| Build complains about a missing `next-env.d.ts` | The file is generated by Next.js on first run. | Run `npm run dev` once, or delete `.next` and rebuild. |
| Type errors after pulling new code | The incremental cache is stale. | Run `npm run clean` followed by `npm run typecheck`. |

---

## 🔒 Security

RepoSec is a **defensive** security tool. It is designed to help maintainers find their own mistakes, not to weaponize findings.

- ✅ The scanner is **read-only**. It never writes to the target repository.
- ✅ The scanner is **stateless**. No scan data is stored on the server.
- ✅ The scanner **masks secrets** before they appear in the UI or exports.
- ✅ The scanner is **branded defensively** — the copy and code avoid language like "hack", "exploit", "bypass", or "steal".

To report a vulnerability in RepoSec itself, please open a private security advisory on GitHub:

> **TODO:** Enable GitHub private security advisories in the repo settings and replace this line with the direct advisory URL.

**Never** commit real secrets to this repository. The included `.gitignore` already excludes `.env*` (with `.env.example` whitelisted as a template).

---

## 📄 License

MIT.

> **TODO:** A `LICENSE` file is not yet committed. The project is shipped as MIT; add the standard MIT license text to a top-level `LICENSE` file before the first public release.

---

## ❤️ Acknowledgements

- 🛡️ Inspired by the public hardening checklists from **GitHub**, **OWASP**, and **Snyk**.
- 🎨 UI primitives adapted from the [shadcn/ui](https://ui.shadcn.com/) patterns, locally authored and customised.
- 🖼️ Icons by [Lucide](https://lucide.dev/).
- 🔔 Toasts by [Sonner](https://sonner.emilkowal.ski/).
- 🤖 Build tooling by [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), and [TypeScript](https://www.typescriptlang.org/).
- 🧪 Visual baseline by [Playwright](https://playwright.dev/).
- 💛 Thanks to every maintainer who takes repo hygiene seriously.
