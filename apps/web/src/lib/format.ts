const NAIRA = "\u20A6";

/** Render a Naira amount as a grouped string, e.g. 3000 -> "₦3,000". */
export function formatNaira(amount: number): string {
  const naira = Math.round(amount);
  return `${NAIRA}${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/** Compact Naira for tight spaces, e.g. 44000 -> "₦44k", 200000 -> "₦200k". */
export function formatNairaShort(amount: number): string {
  const naira = Math.round(amount);
  if (naira >= 1_000_000) return `${NAIRA}${trimZero(naira / 1_000_000)}m`;
  if (naira >= 1_000) return `${NAIRA}${trimZero(naira / 1_000)}k`;
  return `${NAIRA}${naira.toLocaleString("en-NG")}`;
}

function trimZero(value: number): string {
  return Number(value.toFixed(1)).toString();
}

/** Percentage 0-100 (clamped) from a raised/target pair in the same unit. */
export function toPercent(raised: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((raised / target) * 100)));
}

/** Uppercase initials from a name, e.g. "Opeyemi" -> "OP", "Benaiah FC" -> "BF". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Short date like "Jun 26" or with time "Jun 22, 4:08 PM". */
export function formatDate(value: Date | string | number, withTime = false): string {
  const date = value instanceof Date ? value : new Date(value);
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric" };
  return date.toLocaleString("en-NG", opts);
}
