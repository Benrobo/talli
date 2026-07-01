# Architecture

## Shape

```
ai-fullstack-starter/
├── apps/
│   ├── web/           Vite + React 19 + TanStack Router + Query + Tailwind v4
│   └── marketing/     Next.js 16 (App Router)
├── services/
│   └── engine/        Hono + Prisma + Postgres + Redis + Socket.IO + Trigger.dev
├── packages/
│   ├── shared/        Cross-runtime types and constants
│   ├── ui/            cn() + globals.css re-export
│   ├── icons/         Inline-SVG <Icon /> sourced from design-icons
│   └── tailwind-config/  @theme tokens + TS palette export
├── .agents/           Bundled AI skills (universal + Cursor-specific)
├── memory/            Distilled, repo-local agent memory
├── AGENTS.md          Universal entry point for AI agents
└── skills-lock.json   Provenance of every bundled skill
```

## Why this shape

- **Bun + Turbo + workspaces** is the smallest reliable monorepo setup. Bun
  installs are 10x faster than npm and the lockfile resolves consistently
  across CI and local dev.
- **One service** (`engine`) handles HTTP + WebSockets + cron + queue
  consumers. Splitting workers off should be a deliberate decision driven by
  scale, not a default.
- **Two apps** rather than embedding marketing inside the SPA. Next.js is
  better at SEO; Vite is better at hot reload. Don't compromise either.
- **`packages/`** folder is for code that is genuinely shared. If only one
  surface uses it, leave it inside that surface.

## Process model

```
Web   ──HTTPS──▶ Hono on engine (PORT)
Web   ──WSS──▶  Socket.IO on engine (SOCKET_PORT)
engine ──────▶  Postgres (Prisma)
engine ──────▶  Redis (cache + rate limit + ModelKit + notif queue)
engine ──────▶  Cloudflare R2 (S3 SDK)
engine ──────▶  OpenRouter (Vercel AI SDK + ModelKit)
engine ──────▶  Trigger.dev cloud (long-running tasks)
```

The HTTP and Socket.IO listeners run side-by-side in a single Node/Bun
process. Redis is the integration backbone — caching, rate limiting,
notification scheduling, and ModelKit feature configuration all use the
same instance, namespaced by key prefix (`rl:`, `notif:`, `mk:`, `session:`).

## Request flow

1. `requestLogger` middleware tags the request with method/path/status.
2. CORS allowlist enforces `internal-config.ts:CORS_ORIGINS`.
3. The route registers `rateLimiter.rateLimit({...})` if applicable.
4. `validateSchema(zodSchema)` parses the body into `c.get("validatedData")`.
5. `useCatchErrors(...)` wraps the controller so `HttpException`s become JSON.
6. `isAuthenticated(...)` (when needed) validates the JWT and loads the user.
7. The controller responds via `sendResponse.success` / `.error`.

## ModelKit + OpenRouter

`@benrobo/modelkit` keeps per-feature LLM config (model id, temperature,
maxTokens) in Redis. An admin-gated Hono router at `/api/modelkit` exposes
read/write endpoints so model swaps don't require redeploys.

If you don't need it, leave `OPENROUTER_API_KEY` empty and the engine treats
ModelKit as disabled (see `config/modelkit.config.ts`).
