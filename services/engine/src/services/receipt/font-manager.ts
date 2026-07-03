import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import env from "../../config/env.js";
import logger from "../../lib/logger.js";

export interface ReceiptFont {
  name: string;
  data: Buffer<ArrayBufferLike>;
  weight: 400 | 500 | 600 | 700 | 800;
  style: "normal";
}

interface FontSpec {
  fontId: string;
  name: string;
  weight: ReceiptFont["weight"];
}

const FONTS: FontSpec[] = [
  { fontId: "sora", name: "Sora", weight: 400 },
  { fontId: "sora", name: "Sora", weight: 600 },
  { fontId: "sora", name: "Sora", weight: 700 },
  { fontId: "sora", name: "Sora", weight: 800 },
  { fontId: "space-mono", name: "Space Mono", weight: 700 },
];

function fontUrl(fontId: string, weight: number): string {
  return `https://cdn.jsdelivr.net/fontsource/fonts/${fontId}@latest/latin-${weight}-normal.ttf`;
}

/** TrueType/OpenType files start with 0x00010000 or "OTTO"/"true"/"ttcf". */
function looksLikeFont(data: Buffer): boolean {
  if (data.byteLength < 4) return false;
  const sig = data.readUInt32BE(0);
  const tag = data.toString("ascii", 0, 4);
  return sig === 0x00010000 || tag === "OTTO" || tag === "true" || tag === "ttcf";
}

const CACHE_VERSION = "v1";
const CACHE_FILENAME = "receipt-fonts.json";

/**
 * Loads the receipt fonts satori needs, mirroring the renderog font manager: an
 * in-memory cache, then a versioned disk cache under the mounted data dir, then a
 * fetch from the public fonts URL. Nothing is read from the code bundle, so a
 * receipt never depends on assets being copied into the container. Fonts that
 * fail to load are dropped, never crashing the render.
 */
class ReceiptFontManager {
  private cache: ReceiptFont[] | null = null;
  private loading: Promise<ReceiptFont[]> | null = null;

  async getFonts(): Promise<ReceiptFont[]> {
    if (this.cache && this.cache.length) return this.cache;
    if (this.loading) return this.loading;

    this.loading = this.load();
    try {
      const fonts = await this.loading;
      if (fonts.length) this.cache = fonts;
      return fonts;
    } catch (err) {
      logger.error(`[receipt/fonts] load failed: ${(err as Error).message}`);
      return [];
    } finally {
      this.loading = null;
    }
  }

  private cacheDir(): string {
    const base = process.env.VOLUME_MOUNT_PATH ?? (env.NODE_ENV === "development" ? path.join(process.cwd(), "data") : "/data");
    return path.join(base, ".font-cache");
  }

  private async load(): Promise<ReceiptFont[]> {
    const fromDisk = await this.loadFromDisk();
    if (fromDisk) {
      logger.info(`[receipt/fonts] loaded ${fromDisk.length} fonts from disk cache`);
      return fromDisk;
    }

    const fetched = await this.fetchAll();
    if (fetched.length === FONTS.length) await this.saveToDisk(fetched);
    return fetched;
  }

  private async fetchAll(): Promise<ReceiptFont[]> {
    const results = await Promise.all(
      FONTS.map(async (spec) => {
        const url = fontUrl(spec.fontId, spec.weight);
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${res.status}`);
          const data = Buffer.from(await res.arrayBuffer());
          if (!looksLikeFont(data)) throw new Error("not a font (bad signature)");
          const font: ReceiptFont = { name: spec.name, data, weight: spec.weight, style: "normal" };
          return font;
        } catch (err) {
          logger.error(`[receipt/fonts] ${spec.name} ${spec.weight} failed (${url}): ${(err as Error).message}`);
          return null;
        }
      })
    );
    const fonts = results.filter((f): f is ReceiptFont => f !== null);
    logger.info(`[receipt/fonts] fetched ${fonts.length}/${FONTS.length} fonts`);
    return fonts;
  }

  private async loadFromDisk(): Promise<ReceiptFont[] | null> {
    try {
      const file = path.join(this.cacheDir(), CACHE_FILENAME);
      if (!existsSync(file)) return null;
      const parsed = JSON.parse(await readFile(file, "utf-8"));
      if (parsed.version !== CACHE_VERSION) return null;
      return parsed.fonts.map((f: { name: string; data: string; weight: ReceiptFont["weight"] }) => ({
        name: f.name,
        data: Buffer.from(f.data, "base64"),
        weight: f.weight,
        style: "normal" as const,
      }));
    } catch (err) {
      logger.warn(`[receipt/fonts] disk cache read failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async saveToDisk(fonts: ReceiptFont[]): Promise<void> {
    try {
      const dir = this.cacheDir();
      await mkdir(dir, { recursive: true });
      const payload = {
        version: CACHE_VERSION,
        fonts: fonts.map((f) => ({ name: f.name, data: f.data.toString("base64"), weight: f.weight })),
      };
      await writeFile(path.join(dir, CACHE_FILENAME), JSON.stringify(payload));
      logger.info(`[receipt/fonts] saved ${fonts.length} fonts to disk cache`);
    } catch (err) {
      logger.warn(`[receipt/fonts] disk cache write failed: ${(err as Error).message}`);
    }
  }
}

export const receiptFontManager = new ReceiptFontManager();
