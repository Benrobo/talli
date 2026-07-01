import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Local copy of HugeIcons Pro extracted from `~/projects/design-icons`.
 * Override with `DESIGN_ICONS_DIR=/some/path bun run icons:add` if you keep
 * the icon repo somewhere else.
 */
const ICONS_REPO_ROOT =
  process.env.DESIGN_ICONS_DIR ?? "/Users/benaiah/projects/design-icons";

const SUPPORTED_STYLES = ["duotone-rounded", "twotone-rounded"] as const;
type Style = (typeof SUPPORTED_STYLES)[number];

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, "..");
const SVG_ROOT = resolve(PKG_ROOT, "svg");
const SRC_ROOT = resolve(PKG_ROOT, "src");

interface CliArgs {
  list: boolean;
  style: Style;
  names: string[];
  pascal: Record<string, string>;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    list: false,
    style: "duotone-rounded",
    names: [],
    pascal: {},
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--list" || token === "-l") {
      args.list = true;
      continue;
    }
    if (token === "--style" || token === "-s") {
      const value = argv[++i] as Style;
      if (!SUPPORTED_STYLES.includes(value)) {
        throw new Error(
          `Unsupported style "${value}". Choose one of: ${SUPPORTED_STYLES.join(", ")}`
        );
      }
      args.style = value;
      continue;
    }
    if (token === "--as" || token === "-a") {
      const lastName = args.names[args.names.length - 1];
      if (!lastName) throw new Error("--as must follow an icon name");
      args.pascal[lastName] = argv[++i];
      continue;
    }
    args.names.push(token);
  }
  return args;
}

function toPascal(slug: string): string {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
    .replace(/\d+$/, (n) => n)
    .concat("Icon");
}

function listAvailable(style: Style) {
  const dir = resolve(ICONS_REPO_ROOT, "icons", style);
  if (!existsSync(dir)) {
    throw new Error(`Style folder not found: ${dir}`);
  }
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .map((f) => f.replace(/\.svg$/, ""));
  files.sort();
  console.log(`Available icons in ${style} (${files.length}):\n`);
  for (const name of files) console.log(`  ${name}`);
}

function extractInner(svg: string, style: Style): { content: string; viewBox: string } {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch?.[1] ?? "0 0 24 24";

  const innerMatch = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  if (!innerMatch) throw new Error("Could not parse <svg> markup");

  let content = innerMatch[1].trim();

  if (style === "duotone-rounded") {
    content = content.replace(
      /(<path[^>]*opacity="[^"]*"[^>]*)fill="currentColor"/g,
      '$1fill="var(--icon-tone, currentColor)"'
    );
  }
  return { content, viewBox };
}

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function loadExistingIndex(): Set<string> {
  const indexPath = resolve(SRC_ROOT, "index.ts");
  if (!existsSync(indexPath)) return new Set();
  const content = readFileSync(indexPath, "utf-8");
  const matches = content.match(/^\s*([A-Z][A-Za-z0-9]+Icon),?$/gm) ?? [];
  return new Set(matches.map((m) => m.trim().replace(/,$/, "")));
}

interface IconRecord {
  pascalName: string;
  filename: string;
  style: Style;
  content: string;
  viewBox: string;
}

function regenerateIconsFile(records: IconRecord[]) {
  ensureDir(SRC_ROOT);
  const sorted = [...records].sort((a, b) => a.pascalName.localeCompare(b.pascalName));

  const dataLines = sorted.map((r) => {
    const escaped = r.content.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
    return `export const ${r.pascalName}: IconData = {\n  content: \`${escaped}\`,\n  viewBox: "${r.viewBox}",\n  style: "${r.style}",\n};`;
  });

  const iconsTs = `import type { IconData } from "./types.js";\n\n${dataLines.join("\n\n")}\n`;
  writeFileSync(resolve(SRC_ROOT, "icons.ts"), iconsTs);

  const iconNames = sorted.map((r) => r.pascalName);
  const indexTs = `export type { IconData, IconProps, IconStyle } from "./types.js";
export { Icon } from "./icon.js";
export {
${iconNames.map((n) => `  ${n},`).join("\n")}
} from "./icons.js";
`;
  writeFileSync(resolve(SRC_ROOT, "index.ts"), indexTs);
}

function readManifest(): IconRecord[] {
  const indexPath = resolve(SRC_ROOT, "icons.ts");
  if (!existsSync(indexPath)) return [];

  const content = readFileSync(indexPath, "utf-8");
  const records: IconRecord[] = [];
  const blocks = content.matchAll(
    /export const (\w+): IconData = \{\s+content: `([\s\S]*?)`,\s+viewBox: "([^"]+)",\s+style: "([^"]+)",\s+\};/g
  );
  for (const m of blocks) {
    records.push({
      pascalName: m[1],
      filename: m[1].replace(/Icon$/, "").toLowerCase(),
      style: m[4] as Style,
      content: m[2].replace(/\\`/g, "`").replace(/\\\$\{/g, "${"),
      viewBox: m[3],
    });
  }
  return records;
}

function addIcons(args: CliArgs) {
  const styleDir = resolve(ICONS_REPO_ROOT, "icons", args.style);
  if (!existsSync(styleDir)) {
    throw new Error(`Icon style folder missing: ${styleDir}`);
  }

  ensureDir(resolve(SVG_ROOT, args.style));

  const existing = readManifest();
  const known = new Map(existing.map((r) => [r.pascalName, r] as const));

  const additions: IconRecord[] = [];

  for (const slug of args.names) {
    const file = `${slug}.svg`;
    const src = resolve(styleDir, file);
    if (!existsSync(src)) {
      console.warn(`[icons] missing: ${slug} (${args.style})`);
      continue;
    }
    const targetSvg = resolve(SVG_ROOT, args.style, file);
    copyFileSync(src, targetSvg);

    const svg = readFileSync(src, "utf-8");
    const { content, viewBox } = extractInner(svg, args.style);
    const pascalName = args.pascal[slug] ?? toPascal(slug);

    const record: IconRecord = {
      pascalName,
      filename: slug,
      style: args.style,
      content,
      viewBox,
    };

    known.set(pascalName, record);
    additions.push(record);
  }

  if (additions.length === 0 && args.names.length > 0) {
    console.log("[icons] nothing to add");
    return;
  }

  regenerateIconsFile([...known.values()]);
  console.log(`[icons] added ${additions.length} icon(s) (${args.style})`);
  if (additions.length > 0) {
    for (const a of additions) console.log(`  - ${a.pascalName}  <-  ${a.filename}.svg`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.list) {
    listAvailable(args.style);
    return;
  }
  if (args.names.length === 0) {
    console.log(`Usage:
  bun run icons:add <icon-slug> [<icon-slug> ...] [--style duotone-rounded|twotone-rounded] [--as PascalName]
  bun run icons:list [--style duotone-rounded|twotone-rounded]

Defaults to --style duotone-rounded. Source: ${ICONS_REPO_ROOT}/icons/<style>/.`);
    return;
  }
  addIcons(args);
}

main();
