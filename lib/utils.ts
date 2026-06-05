import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function truncate(value: string, max = 80): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "\u2026";
}

export function maskSecret(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "****";
  const start = trimmed.slice(0, 4);
  const end = trimmed.slice(-4);
  return `${start}${"*".repeat(Math.max(4, trimmed.length - 8))}${end}`;
}
