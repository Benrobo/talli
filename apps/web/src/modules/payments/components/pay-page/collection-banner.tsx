import { useId } from "react";

/**
 * A decorative banner rendered as a strip at the top of the pay card — a colored
 * band with a GENERATED pattern layered over it. Nothing is picked from a fixed
 * list: a seeded PRNG (hashed from the collection's identity) composes the whole
 * thing — hue, motif mix, sizes, rotation, density, placement — so every
 * collection gets a one-of-a-kind look that's still stable across visits.
 */

/** Stable 32-bit hash of a string → PRNG seed. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — tiny deterministic PRNG. Same seed → same sequence → same art. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VIEW_W = 400;
const VIEW_H = 160;

type Rng = () => number;
const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;
const range = (rng: Rng, min: number, max: number): number => min + rng() * (max - min);

/** A translucent white ink so shapes read on any hue. */
function ink(rng: Rng): string {
  return `rgba(255,255,255,${range(rng, 0.1, 0.42).toFixed(3)})`;
}

/** Draws one random primitive as an SVG element string. */
function shape(rng: Rng, x: number, y: number, scale: number): string {
  const kind = pick(rng, ["ring", "disc", "arc", "poly", "cross", "square", "blob", "line"]);
  const s = ink(rng);
  const sw = range(rng, 1, 2.4).toFixed(2);
  const rot = Math.floor(range(rng, 0, 360));
  const t = `transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot}) scale(${scale.toFixed(2)})"`;

  switch (kind) {
    case "ring":
      return `<circle r="${range(rng, 8, 22).toFixed(1)}" fill="none" stroke="${s}" stroke-width="${sw}" ${t}/>`;
    case "disc":
      return `<circle r="${range(rng, 3, 12).toFixed(1)}" fill="${s}" ${t}/>`;
    case "arc": {
      const r = range(rng, 10, 26);
      return `<path d="M${-r} 0 A${r} ${r} 0 0 1 ${r} 0" fill="none" stroke="${s}" stroke-width="${sw}" stroke-linecap="round" ${t}/>`;
    }
    case "poly": {
      const sides = Math.floor(range(rng, 3, 6));
      const r = range(rng, 9, 20);
      const pts = Array.from({ length: sides }, (_, i) => {
        const a = (i / sides) * Math.PI * 2;
        return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
      }).join(" ");
      return `<polygon points="${pts}" fill="none" stroke="${s}" stroke-width="${sw}" ${t}/>`;
    }
    case "cross": {
      const r = range(rng, 6, 14).toFixed(1);
      return `<g ${t} stroke="${s}" stroke-width="${sw}" stroke-linecap="round"><line x1="${-r}" y1="0" x2="${r}" y2="0"/><line x1="0" y1="${-r}" x2="0" y2="${r}"/></g>`;
    }
    case "square": {
      const r = range(rng, 7, 18);
      return `<rect x="${(-r / 2).toFixed(1)}" y="${(-r / 2).toFixed(1)}" width="${r.toFixed(1)}" height="${r.toFixed(1)}" rx="${range(rng, 0, 4).toFixed(1)}" fill="none" stroke="${s}" stroke-width="${sw}" ${t}/>`;
    }
    case "blob": {
      const r = range(rng, 10, 22);
      const j = () => (r * range(rng, 0.7, 1.25)).toFixed(1);
      return `<path d="M${j()} 0 Q${j()} ${j()} 0 ${j()} T${-j()} 0 T0 ${-j()} T${j()} 0 Z" fill="${s}" ${t}/>`;
    }
    default: {
      const r = range(rng, 12, 30).toFixed(1);
      return `<line x1="${-r}" y1="0" x2="${r}" y2="0" stroke="${s}" stroke-width="${sw}" stroke-linecap="round" ${t}/>`;
    }
  }
}

/**
 * Builds the whole pattern. The composition itself is randomized: some collections
 * get a tidy scatter, some a dense field, some big overlapping rings, some a fine
 * grain — driven entirely by the seed.
 */
function buildArt(seed: number): { gradient: string; svg: string } {
  const rng = makeRng(seed);

  const hueA = Math.floor(range(rng, 0, 360));
  const hueB = (hueA + Math.floor(range(rng, 20, 90))) % 360;
  const sat = Math.floor(range(rng, 58, 78));
  const light = Math.floor(range(rng, 46, 60));
  const angle = Math.floor(range(rng, 90, 200));
  const gradient = `linear-gradient(${angle}deg, hsl(${hueA} ${sat}% ${light}%), hsl(${hueB} ${sat}% ${light - 8}%))`;

  const density = Math.floor(range(rng, 10, 30));
  const baseScale = range(rng, 0.7, 1.5);
  const parts: string[] = [];
  for (let i = 0; i < density; i++) {
    const x = range(rng, -20, VIEW_W + 20);
    const y = range(rng, -20, VIEW_H + 20);
    const scale = baseScale * range(rng, 0.6, 1.6);
    parts.push(shape(rng, x, y, scale));
  }

  // A couple of oversized accent shapes bleeding off the edges for depth.
  const accents = Math.floor(range(rng, 1, 3));
  for (let i = 0; i < accents; i++) {
    const x = pick(rng, [range(rng, -20, 20), range(rng, VIEW_W - 20, VIEW_W + 20)]);
    const y = pick(rng, [range(rng, -20, 20), range(rng, VIEW_H - 20, VIEW_H + 20)]);
    parts.push(shape(rng, x, y, range(rng, 2.4, 4)));
  }

  return { gradient, svg: parts.join("") };
}

export function CollectionBanner({ seed, className }: { seed: string; className?: string }) {
  const clipId = useId();
  const { gradient, svg } = buildArt(hash(seed));

  return (
    <div className={className} style={{ position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: gradient }} />
      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        dangerouslySetInnerHTML={{ __html: `<g clip-path="url(#${clipId})">${svg}</g><clipPath id="${clipId}"><rect width="${VIEW_W}" height="${VIEW_H}"/></clipPath>` }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.14))",
        }}
      />
    </div>
  );
}
