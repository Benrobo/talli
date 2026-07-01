# Memory

Distilled, durable knowledge about the architecture and conventions of this
codebase. Kept inside the repo so every AI agent working on it sees the same
context, regardless of which client they run in.

## What goes in here

- **Architecture decisions** — why we picked Hono over Express, JWT-in-cookie
  over Better Auth, ModelKit + OpenRouter over a single-vendor SDK, etc.
- **Pattern catalog** — concrete recipes (`use-catch-errors`, `validateSchema`,
  `RateLimiter`) with one-line examples.
- **Hard-earned lessons** — the bugs we already paid for, summarized so we
  don't pay them twice.
- **Glossary** — terms that mean something specific in this codebase
  (engine, modelkit feature id, deferred notification, etc.).

## What does NOT go in here

- Session transcripts. Those live in `~/.claude/projects/` /
  `~/.cursor/projects/` and are noisy. Drop the lessons here, drop the
  transcripts.
- Time-bound notes (deadlines, "we plan to ship X next week"). Memory should
  outlive a sprint.
- Secrets. Ever.

## File map

| File | Topic |
|---|---|
| `architecture.md` | High-level shape: monorepo, engine, web, marketing, packages. |
| `patterns.md` | Pattern recipes (auth, errors, validation, rate limit, AI fallback). |
| `conventions.md` | Naming, file layout, scripts, formatting. |
| `decisions.md` | Decision log distilled from past projects. |
| `lessons.md` | Bugs and surprises worth remembering. |
| `glossary.md` | Terms with project-specific meaning. |

When in doubt, write the new note here first; promote it to a top-level doc
later if it earns wider readership.
