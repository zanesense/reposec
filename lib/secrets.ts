export function maskSecret(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "****";
  const start = trimmed.slice(0, 4);
  const end = trimmed.slice(-4);
  return `${start}${"*".repeat(Math.max(4, trimmed.length - 8))}${end}`;
}
