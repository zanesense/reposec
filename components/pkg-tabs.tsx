"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const COMMANDS = [
  { id: "npm", label: "npm", cmd: "npx reposec ." },
  { id: "yarn", label: "yarn", cmd: "yarn dlx reposec ." },
  { id: "bun", label: "bun", cmd: "bunx reposec ." },
];

function NpmDownloads() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.npmjs.org/downloads/point/last-month/reposec")
      .then((r) => r.json())
      .then((d) => setCount(d.downloads))
      .catch(() => {});
  }, []);

  return (
    <span className="font-mono text-[10px] text-paper/50">
      {count !== null
        ? `${count.toLocaleString()} downloads / month`
        : "loading..."}
    </span>
  );
}

export function PkgTabs() {
  const [active, setActive] = useState("npm");
  const current = COMMANDS.find((c) => c.id === active) ?? COMMANDS[0];

  return (
    <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-xl border-[2.5px] border-ink bg-ink shadow-[3px_3px_0_0_#1a1a1a]">
      <div className="flex border-b-[1.5px] border-ink/20">
        {COMMANDS.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => setActive(pkg.id)}
            className={cn(
              "flex-1 px-2 py-1.5 font-mono text-xs font-semibold transition-colors",
              active === pkg.id
                ? "bg-paper text-ink"
                : "bg-ink text-paper/60 hover:text-paper",
            )}
          >
            {pkg.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <span className="font-mono text-xs text-green-400 select-none">$</span>
        <code className="font-mono text-xs text-paper">{current.cmd}</code>
      </div>
      <div className="flex justify-center border-t-[1.5px] border-ink/20 px-3 py-1.5">
        <NpmDownloads />
      </div>
    </div>
  );
}
