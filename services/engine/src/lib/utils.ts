/**
 * Sleep for a given number of milliseconds. Useful in tests and retry loops.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Slugify a string for URLs and identifiers.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a cryptographically random string suitable for OTPs / nonces.
 * Uses `globalThis.crypto` so it works in Node, Bun, and Workers without
 * extra polyfills.
 */
export function randomToken(length = 32): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a numeric OTP code of the given digit count.
 */
export function randomOtp(digits = 6): string {
  const max = 10 ** digits;
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  return String(bytes[0] % max).padStart(digits, "0");
}

/**
 * Compare two strings in constant time so secret comparisons do not leak
 * timing information. Returns false for length mismatches.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Run a fetch with a timeout. Aborts the request when the timeout fires.
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 30_000, ...rest } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Mask an email for safe logging (e.g. `j****@example.com`).
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 1) return `${local}@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}
