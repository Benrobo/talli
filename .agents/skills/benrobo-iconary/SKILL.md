---
name: benrobo-iconary
description: How to use icons in this project via the @benrobo/iconary package. Load whenever adding, changing, or reviewing icon usage — importing icons, picking an icon style (duotone-rounded, twotone-rounded, etc.), resolving icon export names, or migrating off the old @app/icons package. Covers exact subpath imports, component props (size/color/title), naming rules, and React web vs React Native usage.
---

# Iconary — Agent Skill Guide

**Package:** `@benrobo/iconary`  
**Repo:** `~/projects/iconary` (private)  
**Source SVGs:** `~/projects/design-icons` (never copy raw SVGs into consumer apps)

This document is the **single source of truth** for how AI agents must use icons in projects that depend on Iconary. Follow it strictly. Do not invent APIs, import paths, or icon names.

---

## 1. What Iconary Is

Iconary is a private package that:

1. Reads extracted Hugeicons SVG files from `~/projects/design-icons`
2. Generates TypeScript icon data + React web components + React Native components
3. Exposes them via stable subpath imports

Consumer projects (e.g. `ai-fullstack-starter`, `ai-fullstack-mobile-starter`) install Iconary and import icons — they **do not** vendor SVGs, run icon CLI scripts, or paste inline SVG markup.

---

## 2. Installation

### Local development (sibling repo)

For iconary development only — consumer apps should **not** use `file:../iconary`.

Build iconary before tagging a release:

```bash
cd ~/projects/iconary
bun install
bun run build
git tag v0.1.0 && git push origin v0.1.0
```

### Private GitHub install (production apps — use this in starter kits)

```bash
bun add git+ssh://git@github.com/Benrobo/iconary.git#v0.1.0
```

The tagged release must include a built `dist/` directory.

### React Native peer dependency

Expo / React Native apps **must** have `react-native-svg` installed:

```bash
npx expo install react-native-svg
```

Web-only apps do not need `react-native-svg`.

---

## 3. The model: icon DATA + one renderer (not component-per-icon)

Iconary ships **icon data** (tiny per-style modules) plus **one `Icon` renderer** per
platform. You import the data for the icon you want and render it with `Icon`. There
are **no** `<Home01Icon />` wrapper components and **no** `react/{style}` /
`native/{style}` import paths — those were removed. This matches Hugeicons
(`<HugeiconsIcon icon={...} />`) and keeps the package small + tree-shakeable.

## Import Paths (Exact — Do Not Guess)

| What | Import path | Example |
|---|---|---|
| React web renderer | `@benrobo/iconary/react` | `import { Icon } from "@benrobo/iconary/react"` |
| React Native renderer | `@benrobo/iconary/native` | `import { Icon } from "@benrobo/iconary/native"` |
| Icon **data** for a style | `@benrobo/iconary/core/{style}` | `import { Home01Icon } from "@benrobo/iconary/core/duotone-rounded"` |
| Shared types | `@benrobo/iconary/core` | `import type { IconData } from "@benrobo/iconary/core"` |

There is **no** `@benrobo/iconary/react/{style}` or `@benrobo/iconary/native/{style}`.
Icon names (e.g. `Home01Icon`) are **data exports** from `core/{style}`, not components.

### Available styles (verify in iconary `package.json` exports)

These styles exist when generated from the standard `design-icons` layout:

- `bulk-rounded`
- `duotone-rounded` ← **default for product UI**
- `duotone-standard`
- `solid-rounded`
- `solid-sharp`
- `solid-standard`
- `stroke-rounded`
- `stroke-sharp`
- `stroke-standard`
- `twotone-rounded` ← **brand / social glyphs**

**Do not invent style names.** If unsure, use `duotone-rounded`.

---

## 4. Usage Patterns

### Pattern A — Icon data + renderer (the only pattern)

Import the `Icon` renderer once for the platform, import the icon **data** from
`core/{style}`, and pass it as the `icon` prop.

**React web (Vite, Next.js):**

```tsx
import { Icon } from "@benrobo/iconary/react";
import { Home01Icon } from "@benrobo/iconary/core/duotone-rounded";

<Icon icon={Home01Icon} size={24} color="currentColor" />
<Icon icon={Home01Icon} size={20} color="#B17457" className="shrink-0" />
<Icon icon={Home01Icon} size={24} color="currentColor" title="Home" />
```

**React Native / Expo:**

```tsx
import { Icon } from "@benrobo/iconary/native";
import { Home01Icon } from "@benrobo/iconary/core/duotone-rounded";

<Icon icon={Home01Icon} size={24} color="#F5EDD9" />
```

**Native: always pass an explicit `color` prop.** Do not rely on `currentColor` — React Native SVG does not inherit CSS color like the web.

### Pattern B — Dynamic icons from config

The data-as-prop shape makes config arrays trivial — no mapping to components.

```tsx
import { Icon } from "@benrobo/iconary/react";
import { Home01Icon, Settings01Icon } from "@benrobo/iconary/core/duotone-rounded";

const items = [
  { icon: Home01Icon, label: "Home" },
  { icon: Settings01Icon, label: "Settings" },
] as const;

items.map(({ icon, label }) => (
  <Icon key={label} icon={icon} size={20} color="currentColor" />
));
```

### Pattern C — Brand / social icons

Use `twotone-rounded` data for GitHub, X/Twitter, Discord, LinkedIn, etc.

```tsx
import { Icon } from "@benrobo/iconary/react";
import { GithubIcon, TwitterIcon, DiscordIcon, Linkedin01Icon } from "@benrobo/iconary/core/twotone-rounded";

<Icon icon={GithubIcon} size={20} color="currentColor" />
```

On native, import `Icon` from `@benrobo/iconary/native` (data path is the same `core/{style}`).

---

## 5. `Icon` Props (Exact API)

The `Icon` renderer is the only component. Icon names from `core/{style}` are the
`IconData` you pass to it.

**React web:**

| Prop | Type | Default | Notes |
|---|---|---|---|
| `icon` | `IconData` | — | **Required.** The data import, e.g. `Home01Icon` |
| `size` | `number \| string` | `24` | Sets width and height |
| `color` | `string` | `"currentColor"` | Overrides stroke/fill on icon nodes |
| `strokeWidth` | `number` | — | Overrides stroke width where present |
| `title` | `string` | — | Accessible label; omit for decorative icons |
| `className` | `string` | — | Standard SVG className |
| `...rest` | `SVGSVGElement` attrs | — | Passed to root `<svg>` |

**React Native:** same, minus `title`/`className`; `...rest` is `SvgProps`. **Always
set `color` explicitly on native** — RN SVG does not inherit CSS color.

---

## 6. Icon Naming Rules (Do Not Hallucinate Names)

Source file slugs in `design-icons` map to PascalCase export names with an `Icon` suffix.

| Source file | Export name |
|---|---|
| `home01.svg` | `Home01Icon` |
| `wallet01.svg` | `Wallet01Icon` |
| `book-open.svg` | `BookOpenIcon` |
| `book-open-01.svg` | `BookOpen01Icon` |
| `search01.svg` | `Search01Icon` |
| `settings01.svg` | `Settings01Icon` |
| `user.svg` | `UserIcon` |
| `github.svg` | `GithubIcon` |
| `24-hours-clock.svg` | `TwentyFourHoursClockIcon` |
| `1st-medal.svg` | `FirstMedalIcon` |

### Rules

1. Strip `.svg` extension
2. Split on `-`, `_`, spaces
3. PascalCase each segment
4. Append `Icon` suffix
5. Numeric suffixes stay as digits: `wallet01` → `Wallet01Icon` (not `WalletIcon`)

### How to verify an export exists

**Do not guess.** Check one of:

```bash
grep "export const YourIconName" ~/projects/iconary/dist/generated/core/duotone-rounded/index.d.ts
```

Or use IDE autocomplete after importing from the `core/{style}` subpath.

### Common mistakes (wrong → correct)

| Wrong | Correct |
|---|---|
| `BookOpenIcon` | `BookOpen01Icon` (if source is `book-open-01.svg`) |
| `HomeIcon` | `Home01Icon` |
| `BellIcon` | `Notification01Icon` or `BellDotIcon` (grep first) |
| `@app/icons` | `@benrobo/iconary/core/duotone-rounded` (data) + `Icon` from `/react` |
| `import { Home01Icon } from ".../react/duotone-rounded"` | `import { Home01Icon } from ".../core/duotone-rounded"` (it's data) |
| `<Home01Icon size={20} />` | `<Icon icon={Home01Icon} size={20} />` |
| `<Icon data={...} />` | `<Icon icon={...} />` |
| `tone="..."` prop | `color="..."` prop |
| `label="..."` prop | `title="..."` prop (web only) |

---

## 7. Style Selection Guide

| Use case | Style |
|---|---|
| Default product UI (buttons, nav, cards) | `duotone-rounded` |
| Brand / social logos | `twotone-rounded` |
| Minimal line icons | `stroke-rounded` |
| Filled solid icons | `solid-rounded` |
| Bold filled icons | `bulk-rounded` |

When migrating from the old `@app/icons` package (near-identical shape — it was
already data + renderer):

| Old | New |
|---|---|
| `import { Icon, X } from "@app/icons"` | `import { Icon } from "@benrobo/iconary/react";` + `import { X } from "@benrobo/iconary/core/duotone-rounded";` |
| `<Icon data={X} size={20} tone="..." />` | `<Icon icon={X} size={20} color="..." />` |
| `<Icon data={X} label="Home" />` | `<Icon icon={X} title="Home" />` |
| `bun icons:add home01` | Import directly — all icons already generated |
| `bun icons:list` | Grep iconary core `.d.ts` or browse `~/projects/design-icons/icons/` |

The two mechanical changes are: `data` → `icon`, `tone` → `color`. The icon-name
imports move from `@app/icons` to `@benrobo/iconary/core/{style}`, and `Icon` comes
from `@benrobo/iconary/react`.

---

## 8. Hard Rules for Agents

1. **Never paste raw `<svg>` markup** into components. Import from Iconary.
2. **Never create a local `icons.tsx` registry** in consumer apps. Iconary is the registry.
3. **Never depend on `@hugeicons/react` or `lucide-react`** unless explicitly asked — this project uses Iconary.
4. **Never run `bun icons:add`** in starter kits — that CLI was removed. Import from Iconary subpaths.
5. **Never import from `@app/icons`** — that package was removed.
6. **Never import from iconary source paths** like `iconary/src/...` — only from published subpaths.
7. **Always use exact export names** — verify via the core `.d.ts` or autocomplete, do not infer.
8. **Icon names are DATA from `core/{style}`** — render them with `Icon`. There are no `<XIcon/>` components and no `react/{style}` / `native/{style}` paths.
9. **Web imports `Icon` from `/react`, native from `/native`** — the data path (`core/{style}`) is shared. Never render native data with the web `Icon` or vice versa.
10. **Pass explicit `color` on React Native** — always.
11. **Do not commit `~/projects/design-icons` SVG files** into consumer repos.

---

## 9. Adding New Icons

Icons are **not** added per consumer project. The flow is:

1. SVGs live in `~/projects/design-icons/icons/{style}/`
2. Regenerate Iconary: `cd ~/projects/iconary && bun run build`
3. Reinstall in consumer: `bun install` (if using `file:../iconary`)
4. Import the new data export from `@benrobo/iconary/core/{style}` and render with `Icon`

If an SVG is missing from `design-icons`, add it there first — not in the consumer app.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find module '@benrobo/iconary/...'` | Run `bun run build` in iconary, then `bun install` in consumer |
| `XIcon is not exported` | Grep `dist/generated/core/{style}/index.d.ts` for exact name |
| Icons invisible on native | Pass explicit `color` prop |
| TypeScript errors on icon imports | Ensure iconary `dist/` includes `.d.ts` files (`bun run build`) |
| Dev server slow after adding many icons | Import only the icons you need; avoid barrel re-exports in app code |

---

## 11. Starter Kit References

| Repo | Renderer | Data |
|---|---|---|
| `ai-fullstack-starter` | `Icon` from `@benrobo/iconary/react` | `@benrobo/iconary/core/*` |
| `ai-fullstack-mobile-starter` | `Icon` from `@benrobo/iconary/react` \| `/native` | `@benrobo/iconary/core/*` |

Both repos install Iconary as a Git dependency:

```json
"@benrobo/iconary": "git+ssh://git@github.com/Benrobo/iconary.git#v0.1.0"
```

When working in those repos, read this file at `~/projects/iconary/skills.md` or `@benrobo/iconary` package root before adding or changing icon usage.

---

## 12. Quick Copy-Paste Examples

### Web nav item

```tsx
import { Icon } from "@benrobo/iconary/react";
import { Home01Icon } from "@benrobo/iconary/core/duotone-rounded";

<a href="/" className="flex items-center gap-2">
  <Icon icon={Home01Icon} size={20} color="currentColor" />
  Home
</a>
```

### Native tab bar icon

```tsx
import { Icon } from "@benrobo/iconary/native";
import { Home01Icon } from "@benrobo/iconary/core/duotone-rounded";

<Icon icon={Home01Icon} size={24} color="#B17457" />
```

### Dynamic icon from config

```tsx
import { Icon } from "@benrobo/iconary/react";
import { Home01Icon, Settings01Icon } from "@benrobo/iconary/core/duotone-rounded";

const items = [
  { icon: Home01Icon, label: "Home" },
  { icon: Settings01Icon, label: "Settings" },
] as const;

items.map(({ icon, label }) => (
  <Icon key={label} icon={icon} size={20} color="currentColor" />
));
```

### Brand row

```tsx
import { Icon } from "@benrobo/iconary/react";
import { GithubIcon, TwitterIcon, DiscordIcon } from "@benrobo/iconary/core/twotone-rounded";

<div className="flex gap-4">
  <Icon icon={GithubIcon} size={20} color="currentColor" />
  <Icon icon={TwitterIcon} size={20} color="currentColor" />
  <Icon icon={DiscordIcon} size={20} color="currentColor" />
</div>
```
