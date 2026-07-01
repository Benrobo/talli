import fs from "node:fs";
import path from "node:path";
import env from "../config/env.js";

/**
 * Sleep for a given number of milliseconds. Useful in tests and retry loops.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEBUG_DIR = path.join(process.cwd(), ".debug");

/**
 * Ensures the debug directory exists.
 */
function ensureDebugDir(): void {
  if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
  }
}

/**
 * Get the path to a debug file.
 */
export function getDebugPath(filename: string): string {
  ensureDebugDir();
  return path.join(DEBUG_DIR, filename);
}

/**
 * Typesafe file writer for {@link debugInDev}.
 */
type SaveToFile = <T extends string | NodeJS.ArrayBufferView>(
  filename: string,
  content: T
) => void;

/**
 * Execute code only in development, for debugging. The callback receives a path
 * helper and a saveToFile writer, so prompts and LLM responses can be dumped to
 * `.debug/` to inspect what the model actually saw and returned. No-op in
 * production. Mirrors scribe's `debugInDev`.
 */
export function debugInDev(
  fn: (debugPath: (filename: string) => string, saveToFile: SaveToFile) => void
): void {
  try {
    if (env.NODE_ENV !== "development") return;
    ensureDebugDir();
    const saveToFile: SaveToFile = (filename, content) => {
      try {
        fs.writeFileSync(getDebugPath(filename), content);
      } catch (err) {
        console.debug("[debugInDev: saveToFile error]:", err);
      }
    };
    fn(getDebugPath, saveToFile);
  } catch (err) {
    console.debug("[debugInDev: Error]: ", err);
  }
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
 * Generate a short, human-friendly code like `KOL-9281` for deep-link sharing.
 * Avoids ambiguous characters (no O/0, I/1) since users may read it aloud.
 */
export function randomLinkCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (set: string, n: number) => {
    const bytes = new Uint8Array(n);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => set[b % set.length]).join("");
  };
  return `${pick(letters, 3)}-${pick(digits, 4)}`;
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
 * SHA-256 hash of a string, hex-encoded. Used to store secrets (e.g. chat
 * link codes) hashed at rest. Uses the Web Crypto API so it works on Node,
 * Bun, and Workers.
 */
export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
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
