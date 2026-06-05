import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const PORT = 4001;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(process.cwd(), "public", "screenshots");

const SHOTS = [
  {
    name: "01-home-light",
    async setup(page) {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    },
    wait: 800,
    skipUnroute: false,
  },
  {
    name: "02-scan-loading",
    async setup(page) {
      // Hold the API response so we capture the loading UI, not the finished report.
      await page.route("**/api/scan", async (route) => {
        await new Promise((r) => setTimeout(r, 4500));
        await route.continue();
      });
      await page.goto(`${BASE}/scan?owner=sindresorhus&repo=awesome`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector("text=Drawing the picture", { timeout: 8000 });
    },
    wait: 2000,
    skipUnroute: true,
  },
  {
    name: "03-report-overview",
    async setup(page) {
      // Suppress the success toast so it does not overlap the score gauge.
      await page.addStyleTag({
        content: `[data-sonner-toaster] { display: none !important; }`,
      });
      await page.goto(`${BASE}/scan?owner=sindresorhus&repo=awesome`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector("text=Quick summary", { timeout: 45000 });
    },
    wait: 1800,
    skipUnroute: false,
  },
  {
    name: "04-report-findings",
    async setup(page) {
      await page.addStyleTag({
        content: `[data-sonner-toaster] { display: none !important; }`,
      });
      await page.goto(`${BASE}/scan?owner=sindresorhus&repo=awesome`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector("text=Quick summary", { timeout: 45000 });
      await page.getByRole("tab", { name: /Findings/i }).click();
    },
    wait: 800,
    skipUnroute: false,
  },
  {
    name: "05-report-export",
    async setup(page) {
      await page.addStyleTag({
        content: `[data-sonner-toaster] { display: none !important; }`,
      });
      await page.goto(`${BASE}/scan?owner=sindresorhus&repo=awesome`, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector("text=Quick summary", { timeout: 45000 });
      await page.getByRole("tab", { name: /^Export$/i }).click();
    },
    wait: 800,
    skipUnroute: false,
  },
];

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
      shell: false,
      ...opts,
    });
    proc.stdout?.on("data", (b) => process.stdout.write(`[${opts.tag ?? cmd}] ${b.toString()}`));
    proc.stderr?.on("data", (b) => process.stderr.write(`[${opts.tag ?? cmd}] ${b.toString()}`));
    proc.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

async function startServer() {
  console.log("[screenshots] Building Next.js production bundle...");
  await run("node", ["node_modules/next/dist/bin/next", "build"], { tag: "build" });

  console.log(`[screenshots] Starting server on :${PORT}`);
  const proc = spawn(
    "node",
    ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)],
    {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
      shell: false,
    },
  );
  proc.stdout?.on("data", (b) => process.stdout.write(`[next] ${b.toString()}`));
  proc.stderr?.on("data", (b) => process.stderr.write(`[next] ${b.toString()}`));

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/`, { method: "GET" });
      if (res.ok) return proc;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill("SIGTERM");
  throw new Error("Server did not become ready in time");
}

async function main() {
  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

  const server = await startServer();
  let exitCode = 0;
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });

    for (const shot of SHOTS) {
      console.log(`[screenshots] ${shot.name}`);
      // Fresh page per shot so route handlers do not leak between shots.
      const shotPage = await context.newPage();
      try {
        await shot.setup(shotPage);
        if (shot.wait) await shotPage.waitForTimeout(shot.wait);
        const file = path.join(OUT, `${shot.name}.png`);
        await shotPage.screenshot({ path: file, fullPage: true });
        console.log(`[screenshots]   saved ${file}`);
      } catch (err) {
        console.error(`[screenshots]   FAILED:`, err);
        exitCode = 1;
      } finally {
        if (shot.skipUnroute) {
          try {
            await shotPage.unroute("**/api/scan");
          } catch {
            /* ignore */
          }
        }
        await shotPage.close();
      }
    }

    await browser.close();
  } finally {
    server.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
    if (!server.killed) server.kill("SIGKILL");
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
