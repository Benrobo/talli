# AGENTS.md

Universal instructions for AI coding agents (Cursor, Claude Code, Codex,
plus anything that picks up `AGENTS.md` automatically).

## You are working in

A Bun + Turbo monorepo with a Hono engine, a Vite SPA, a Next.js marketing
site, and a portable AI memory layer. The full architecture is in
`memory/architecture.md`.

## Read before you write

When an agent starts on a task in this repo, the first thing to do is load
the relevant memory files:

| Task type | Files to read first |
|---|---|
| Adding an API route | `memory/patterns.md`, `services/engine/src/routes/auth.route.ts` (canonical example) |
| Touching auth | `memory/patterns.md`, `services/engine/src/middleware/auth.ts`, `memory/lessons.md` |
| Adding an AI call | `memory/patterns.md` (recipe 5), `services/engine/src/services/ai/index.ts` |
| Adding a notification | `services/engine/src/lib/notification-queue.ts`, `memory/patterns.md` (recipe 8) |
| Touching the web router | `apps/web/src/routes/__root.tsx`, `memory/patterns.md` |
| Adding an icon | the `benrobo-iconary` skill + the Icons section below |
| Editing styles / tokens | `packages/tailwind-config/globals.css`, `memory/conventions.md` |

## Hard rules

- **No inline comments.** The codebase carries doc strings (`/** ... */`)
  above declarations only. Do not add `// this does X` or block comments
  inside functions. If a piece of logic needs an explainer, the explainer
  belongs in `memory/` or in a JSDoc above the export.
- **Bun is the package manager.** Use `bun install`, `bun add`, `bun run`,
  `bun --filter`. Never invoke `npm`, `pnpm`, `yarn`.
- **No `console.log` in committed engine code.** Use `logger` from
  `services/engine/src/lib/logger.ts`.
- **Throw `HttpException` subclasses,** never `return sendResponse.error`
  manually from controllers. `useCatchErrors` translates exceptions to
  JSON.
- **Validate every body with Zod.** Schemas live in
  `services/engine/src/schemas/<feature>.schema.ts` and the route applies
  `validateSchema(schema)` before the controller.
- **Authenticated routes use `useCatchErrors(isAuthenticated(handler))`.**
  In that order. Skipping the wrap means errors return as 500s with stack
  traces, which is a security problem.
- **Don't paste raw SVG into components.** Icons come from `@benrobo/iconary`
  (see the `benrobo-iconary` skill): `import { Icon } from "@benrobo/iconary/react"`
  + icon data from `@benrobo/iconary/core/<style>`, rendered as
  `<Icon icon={Home01Icon} color="currentColor" />`. Never use the old
  `@app/icons` package or `bun icons:add`.
- **`@benrobo/iconary` is a private GitHub Packages dependency.** Installing it
  needs `GITHUB_TOKEN` (scope `read:packages`) in your env — the root `.npmrc`
  reads it as `${GITHUB_TOKEN}`. No token is committed. See `.env.example`.

## Available patterns

See `memory/patterns.md` for ten copy-paste-ready recipes. The most common:

```ts
router.post(
  "/widgets",
  requireFeature("widgets"),
  rateLimiter.rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "widgets" }),
  validateSchema(createWidgetSchema),
  useCatchErrors(isAuthenticated(controller.create.bind(controller)))
);
```

## Icons (very important)

Icons come from **`@benrobo/iconary`** — a private package on GitHub Packages,
not a local folder. Install needs `GITHUB_TOKEN` (see Hard rules). The old
`@app/icons` package and `bun icons:add` CLI are **removed**.

The model is **icon data + one renderer**: import the `Icon` renderer once, import
the icon data from `core/<style>`, and pass it as `icon`.

```tsx
import { Icon } from "@benrobo/iconary/react";
import { Home01Icon } from "@benrobo/iconary/core/duotone-rounded";

<Icon icon={Home01Icon} size={20} color="currentColor" />
```

Styles: **`duotone-rounded`** is the default for product UI;
**`twotone-rounded`** for brand glyphs (GitHub, X, Discord). Verify exact export
names via autocomplete on `@benrobo/iconary/core/<style>` — don't guess.

Full rules, props, and naming are in the **`benrobo-iconary`** skill
(`.agents/skills/benrobo-iconary/SKILL.md`). New icons are added in
`~/projects/design-icons` and released from `~/projects/iconary` (see its
README) — never vendored into this repo.

## Available skills

Inside `.agents/skills/` and `.agents/skills-cursor/`. Load
`SKILL.md` from the skill folder when the task matches the skill's
description. The skill index is in `.agents/README.md`.

Project-local additions include `karpathy-guidelines` for Andrej
Karpathy-inspired guardrails around assumptions, simplicity, surgical
changes, and verification.

If a needed skill is missing, check the `find-skills` skill for how to
discover and install one.

## Memory files

| File | When to load |
|---|---|
| `memory/architecture.md` | First task on the repo, or anything cross-cutting. |
| `memory/patterns.md` | Adding any engine route, controller, or service. |
| `memory/conventions.md` | Naming, file layout, formatting, env handling. |
| `memory/decisions.md` | Asked "why are we using X?". |
| `memory/lessons.md` | Debugging unexpected behavior — there's likely a known answer. |
| `memory/glossary.md` | Term you don't recognize (engine, feature id, deferred notification). |

## Tone

Be concrete. Edit files; don't propose edits. When you finish a task, list
the files you changed. Stop when the task is done — don't add tests, docs,
or extra polish unless asked.
