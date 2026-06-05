import { createHash } from "node:crypto";

export function fingerprintSecret(value: string): string {
  return createHash("sha256").update(value.trim()).digest("hex").slice(0, 16);
}
