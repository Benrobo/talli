# ai-fullstack-starter

Opinionated, AI-friendly fullstack starter. Bun + Turborepo monorepo with a
Hono engine, a Vite + React 19 SPA, a Next.js 16 marketing site, Prisma +
Postgres, Redis, Trigger.dev, Socket.IO, the Vercel AI SDK + OpenRouter,
and a portable agent memory layer baked in.

> Mobile-inclusive twin: [`ai-fullstack-mobile-starter`](../ai-fullstack-mobile-starter)
> adds an Expo + Uniwind app on top of the same engine, web, and packages.

## What's inside

```
ai-fullstack-starter/
├── apps/
│   ├── web/              Vite + React 19 + TanStack Router + Query + Tailwind v4
│   └── marketing/        Next.js 16 (App Router)
├── services/
│   └── engine/           Hono + Prisma + Postgres + Redis + Socket.IO + Trigger.dev
├── packages/
│   ├── shared/           Cross-runtime types and constants
│   ├── ui/               cn() + globals.css re-export
│   ├── icons/            Inline-SVG <Icon /> sourced from ~/projects/design-icons
│   └── tailwind-config/  @theme tokens + TS palette
├── .agents/
│   ├── skills/           Bundled universal skills (Claude / Codex / Cursor)
│   └── skills-cursor/    Cursor-specific skills
├── .cursor/              Project rules and MCP servers
├── memory/               Curated, repo-local agent memory
├── scripts/              Helper shell scripts
├── AGENTS.md             Universal AI agent instructions
├── CLAUDE.md             Pointer for Claude Code
└── skills-lock.json      Skill provenance
```

## Quick start

```bash
bun install

cp .env.example .env
cp services/engine/.env.example services/engine/.env

bun --filter @app/engine db:migrate

bun dev
```

Defaults:

- Engine: http://localhost:6590
- Socket.IO: http://localhost:6591
- Web SPA: http://localhost:5173
- Marketing: http://localhost:3001

## Stack snapshot

| Layer | Tech |
|---|---|
| Package manager / orchestrator | Bun + Turborepo |
| Web SPA | Vite 6, React 19, TanStack Router (file-based), TanStack Query, Tailwind v4 |
| Marketing | Next.js 16 (App Router), Tailwind v4 |
| Engine | Hono, Prisma 7, PostgreSQL, ioredis, Socket.IO, Winston |
| Auth | Custom JWT in httpOnly cookie + `AuthSession` rows + Redis-backed cache |
| AI | Vercel AI SDK + OpenRouter + ModelKit-style admin sub-router |
| Background jobs | Trigger.dev v4 (Bun runtime) |
| Cron | `node-cron` in-process |
| Storage | Cloudflare R2 (S3 SDK) |
| Realtime | Socket.IO on a separate port, JWT on handshake, `user:${id}` rooms |
| Mail | Plunk (`MailProvider` interface — swap providers in five lines) |
| Tooling | TypeScript strict, Prettier, Zod everywhere |

## Icons

Icons come from your local
[`design-icons`](https://github.com/Benrobo/design-icons) repo at
`~/projects/design-icons/`. Two styles ship out of the box:

- **`duotone-rounded`** — two-tone filled icons. The opacity layer is
  themable through a `--icon-tone` CSS variable, so you can tint the
  secondary color per component, per theme, or per dark mode without
  swapping assets.
- **`twotone-rounded`** — two-color stroke icons. Use for brand glyphs
  (`GithubIcon`, `TwitterIcon`, `Linkedin01Icon`, `DiscordIcon`).

Add or browse icons:

```bash
bun icons:add home01                 # default style: duotone-rounded
bun icons:add github --style twotone-rounded
bun icons:add user-circle --as ProfileIcon
bun icons:list                       # browse what's available in the source repo
```

See [`packages/icons/README.md`](packages/icons/README.md) for the full
guide, including how the duotone CSS variable mechanic works and how to
point at a different icon repo via `DESIGN_ICONS_DIR`.

## AI memory layer

Skills and memory live **inside the codebase**, so every contributor (human
or AI) gets the same context after a clone. Nothing in `~/.claude/`,
`~/.codex/`, `~/.cursor/`, or `~/.agents/` is required for this repo to
work.

| Location | Role |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Universal entry point. Cursor, Claude Code, Codex, and most other agents auto-load this. |
| [`CLAUDE.md`](CLAUDE.md) | Pointer for Claude Code. |
| [`.cursor/rules/index.mdc`](.cursor/rules/index.mdc) | Cursor-specific summary of the same rules. |
| [`.agents/skills/`](.agents/) | Bundled universal skills (frontend-design, tanstack-router-best-practices, web-perf, workers-best-practices, wrangler, agents-sdk, cloudflare, durable-objects, sandbox-sdk, find-skills). |
| [`.agents/skills-cursor/`](.agents/) | Cursor-specific skills (create-rule, create-skill, split-to-prs, babysit). |
| [`memory/`](memory/) | Curated, project-specific notes (architecture, patterns, conventions, decisions, lessons, glossary). |
| [`skills-lock.json`](skills-lock.json) | Skill provenance. |

To make these skills available globally instead of (or in addition to) the
project-local copy:

```bash
bun skills:install
```

This symlinks `.agents/skills/<name>` into `~/.agents/skills/<name>` so any
update flows both ways.

## Scripts

```bash
bun dev                  # Run engine + web + marketing in parallel
bun dev:engine           # Engine only
bun dev:web              # Web SPA only
bun dev:marketing        # Marketing only
bun build                # Build everything
bun type-check           # Type-check every workspace
bun format               # Prettier write

bun db:generate          # prisma generate
bun db:migrate           # prisma migrate dev
bun db:studio            # Open Prisma Studio

bun icons:add <slug>     # Vendor an icon from ~/projects/design-icons
bun icons:list           # List available icons in a style
bun skills:install       # Symlink bundled skills into ~/.agents
```

## Conventions in 60 seconds

- **No inline comments.** JSDoc above exports only. The why-of-it lives in
  `memory/` or in skill docs.
- **Bun, always.** Never `npm`, `pnpm`, or `yarn`.
- **`HttpException` for errors.** Never craft error JSON manually in a
  controller.
- **Zod for input.** Schemas live in `services/engine/src/schemas/`.
- **`useCatchErrors(isAuthenticated(handler))`.** In that order, every
  authenticated route.
- **`logger`, not `console.log`,** in engine code.
- **Tailwind v4 `@theme` tokens** are the source of truth for colors.

The full convention list is in [`memory/conventions.md`](memory/conventions.md).
The pattern catalog is in [`memory/patterns.md`](memory/patterns.md).

## License

Private starter. Pick a license before you publish.
