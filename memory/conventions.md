# Conventions

## Files and folders

- **One concern per file.** A controller file holds one controller class.
  A schema file holds one feature's Zod schemas.
- **`*.controller.ts`, `*.route.ts`, `*.service.ts`, `*.schema.ts`** for
  engine surfaces. The suffix is part of the name; do not omit.
- **Controllers are thin; business logic lives in `*.service.ts`.**
  A controller only does HTTP work: read validated input off `ctx`, call a
  service method, set cookies, and return `sendResponse`. **No `prisma`,
  `redis`, `jwt`, or other data-layer calls inside a controller** — those
  belong in a service so they stay reusable and testable. `auth.service.ts`
  and `workspace.service.ts` are the reference; scribe and elorah follow the
  same controller→service split.
- **kebab-case** for file names. **PascalCase** for component and class names.
  **camelCase** for functions and variables.
- **`packages/<name>`** package names use `@app/<name>` in `package.json`.
- **Imports use `.js` extensions** for engine source so the compiled output
  resolves correctly under Node ESM. Vite tooling rewrites these in the web
  bundle automatically.

## Comments

Code in this repo carries **no inline comments**. The only allowed
prose-in-source is a JSDoc block (`/** ... */`) above an exported declaration
that explains its **why** or non-obvious **constraints**. Avoid TODOs in
checked-in code; use a tracking system or a `@todo` JSDoc tag.

## Errors

Throw `HttpException` subclasses (`BadRequestException`, etc.). Do not
return error envelopes manually from controllers — let `useCatchErrors`
translate the exception.

## Logging

Use `logger` from `lib/logger.ts`. Never `console.log` in committed engine
code. The web app may use `console.*` during development; promote to a
proper logger before shipping.

## Env vars

- Engine env is parsed and validated in `config/env.ts`. Add new keys there
  with a Zod entry. The process exits on invalid env.
- Vite reads `VITE_*`. Next reads `NEXT_PUBLIC_*` on the client. Mirror new
  keys into the root `.env.example` and the relevant per-app `.env.example`.

## Database

- Prisma schema is **split** under `services/engine/src/prisma/schema/`.
  Each domain gets its own `.prisma` file. `_base.prisma` holds the
  generator + datasource.
- Migrations are committed; never run `db:push` against shared environments.
- Models map to snake_case table names via `@@map`.

## Testing

There is no test scaffolding in this starter; pick Vitest + Supertest for
the engine and Vitest + Testing Library for the web when you need it.

## Scripts

Top-level scripts in root `package.json`:

| Script | Purpose |
|---|---|
| `bun dev` | Run every workspace in parallel via Turbo. |
| `bun dev:engine` / `dev:web` / `dev:marketing` | Run a single surface. |
| `bun build` | Build every workspace. |
| `bun lint` / `type-check` | Run via Turbo. |
| `bun format` | Prettier write. |
| `bun db:generate` / `db:push` / `db:migrate` / `db:studio` | Prisma. |
| `bun icons:add <slug>` | Vendor an icon from `~/projects/design-icons/`. |
| `bun icons:list` | List available icons in a style. |
| `bun skills:install` | Symlink bundled skills into `~/.agents/skills/`. |

## Git

- Default branch is `main`.
- Commit messages: imperative, lower-case, scope optional. `add widget create
  endpoint` over `Added a widget create endpoint`.
- Don't commit `.env` files.
- Don't commit generated artifacts (`dist`, `.next`, `.turbo`,
  `routeTree.gen.ts`). The starter `.gitignore` already handles these.
