# @app/icons

Icon system for the project. Inline-SVG components rendered through a single
`<Icon />` primitive, sourced from your local
[`design-icons`](https://github.com/Benrobo/design-icons) repo at
`~/projects/design-icons/icons/<style>/`.

## Why this approach

- **Zero runtime weight per icon.** Only the SVG strings you import end up
  in the bundle.
- **No license keys in CI.** The HugeIcons Pro license is consumed once, in
  the `design-icons` workspace, not in every product repo.
- **Themable duotone.** The opacity layer of duotone-rounded icons is
  routed through a CSS variable (`--icon-tone`) so you can tint the
  secondary color per call site, per theme, or per dark mode without
  swapping assets.

## Where icons live

| Location | Role |
|---|---|
| `~/projects/design-icons/icons/duotone-rounded/` | **Source** for duotone (filled, two-tone) icons. |
| `~/projects/design-icons/icons/twotone-rounded/` | **Source** for two-color stroke icons (great for brand glyphs). |
| `packages/icons/svg/<style>/` | **Vendored** SVG files copied from the source — what the bundle ships. |
| `packages/icons/src/icons.ts` | Generated TypeScript exports (one `IconData` const per icon). |

The two style folders mirror the directory structure in `design-icons` so
running the CLI with `--style duotone-rounded` (default) or
`--style twotone-rounded` fetches from the right place.

## Adding an icon

```bash
bun icons:add home01
bun icons:add github --style twotone-rounded
bun icons:add user-circle --as ProfileIcon
```

The CLI:

1. Copies `~/projects/design-icons/icons/<style>/<slug>.svg` into
   `packages/icons/svg/<style>/<slug>.svg`.
2. Extracts the inner SVG markup and the `viewBox`.
3. For duotone icons, rewrites `fill="currentColor"` on the opacity layer
   to `fill="var(--icon-tone, currentColor)"`.
4. Regenerates `src/icons.ts` and `src/index.ts` so the new `IconData` and
   re-export are immediately available across the monorepo.

If the slug doesn't exist in `design-icons`, the CLI logs a warning and
moves on — add it to `design-icons` first (`bun extract` in that repo) and
re-run.

## Browsing what's available

```bash
bun icons:list
bun icons:list --style twotone-rounded
```

For a visual catalog, run the design-icons preview server:

```bash
cd ~/projects/design-icons
bun run serve   # http://localhost:4200
```

## Using an icon

```tsx
import { Icon, Home01Icon, GithubIcon } from "@app/icons";

<Icon data={Home01Icon} size={20} />
<Icon data={Home01Icon} size={24} tone="oklch(76% 0.12 80)" />
<Icon data={Home01Icon} className="text-brand-500" />

<Icon data={GithubIcon} size={18} />
```

`tone` only affects duotone icons (the `--icon-tone` CSS variable is
ignored by twotone strokes). For accessibility, pass `label="Open menu"`
when the icon stands alone; omit it when the icon is decorative.

## Naming

The CLI converts the kebab-case slug into PascalCase + the `Icon` suffix:

- `home01` -> `Home01Icon`
- `arrow-up-down` -> `ArrowUpDownIcon`
- `magic-wand01` -> `MagicWand01Icon`

Override the generated name with `--as`:

```bash
bun icons:add user-circle --as ProfileIcon
```

## Pointing at a different icon repo

If your `design-icons` clone lives elsewhere, override the source path:

```bash
DESIGN_ICONS_DIR=/some/other/path bun icons:add home01
```

## Don't paste raw SVG

If you find yourself reaching for an inline `<svg>` in a component, stop.
Run `bun icons:add` first. The single import point keeps tone overrides
consistent across the app.
