# Decision log

Distilled from running brandowl, scribe, savi, toneprint, bounta, and custo
side-by-side. Each decision states what we chose, what we rejected, and why.

## Backend framework: Hono + Prisma over Express / NestJS

- **Picked**: Hono (`@hono/node-server`) plus an `App` class wrapper.
- **Rejected**: Express (slower middleware perf, unmaintained typings) and
  NestJS (overkill DI for a single service).
- **Why**: Hono's middleware composition is closer to what we want than
  Express, and it ports trivially to Cloudflare Workers if we ever need
  edge deploys. The `App` class keeps `cors`, the request logger, the
  ModelKit admin gate, and route registration in one obvious place.

## Auth: custom JWT + httpOnly cookie + Prisma session

- **Picked**: short-lived access token in an httpOnly cookie, refresh token
  in a sibling cookie, `AuthSession` row in Postgres, in-memory cache of
  validated sessions.
- **Rejected**: Better Auth (couples too tightly to Prisma migrations),
  Clerk and NextAuth (vendor lock-in, harder for native clients).
- **Why**: Six prior projects landed on the same pattern. We control every
  field on the session, can revoke individually, and bear no per-user cost.

## AI: Vercel AI SDK + OpenRouter + ModelKit

- **Picked**: `ai` package + `@openrouter/ai-sdk-provider` + `@benrobo/modelkit`
  Redis adapter, with a Hono admin router at `/api/modelkit`.
- **Rejected**: hard-coded model ids in env, single-vendor SDKs.
- **Why**: every product changed model preferences mid-flight. ModelKit
  makes that a config edit, not a deploy.

## Job runner: Trigger.dev v4 over BullMQ / Cloud Run / Inngest

- **Picked**: Trigger.dev with the Bun runtime.
- **Rejected**: BullMQ (operational burden), Cloud Run jobs (cold start),
  Inngest (less ergonomic for long-running media pipelines).
- **Why**: Free tier is generous, the dev UI is excellent, and the same
  task definition runs in dev and prod with no infra changes.

## Realtime: Socket.IO on a separate port over SSE / WebTransport

- **Picked**: Socket.IO with JWT on handshake, user rooms, RQ invalidation.
- **Rejected**: SSE (one-way), pure ws (no rooms, no fallback), tRPC
  subscriptions (locks the API style).
- **Why**: Socket.IO's room semantics + automatic reconnection are still
  the cheapest reliable option.

## State: TanStack Query everywhere, Zustand for local-only state

- **Picked**: TanStack Query for server cache, Zustand for ephemeral UI
  state (auth flag, lock screen, etc.).
- **Rejected**: Redux Toolkit (too much ceremony), Recoil (abandoned).
- **Why**: ~95% of state in our products is server state. Stop pretending
  otherwise.

## Routing: TanStack Router (file-based) with autoCodeSplitting

- **Picked**: `@tanstack/react-router` + `@tanstack/router-plugin/vite`.
- **Rejected**: React Router v7 (better, but TanStack's beforeLoad +
  context.queryClient pattern is unmatched for auth gating).
- **Why**: One place to prefetch + redirect + bind context. The same pattern
  is used in scribe, brandowl, custo, savi, and toneprint.

## Styling: Tailwind v4 with `@theme` tokens

- **Picked**: Tailwind v4 via `@tailwindcss/vite` and `@tailwindcss/postcss`.
- **Rejected**: Tailwind v3 (older preset format), CSS Modules (composition
  pain), CSS-in-JS (runtime cost).
- **Why**: v4's CSS-first design tokens make a single `globals.css` the
  source of truth across web, marketing, and (in the mobile starter) RN
  through Uniwind.

## Icons: `@benrobo/iconary` from GitHub Packages (HugeIcons Pro source)

- **Picked**: consume `@benrobo/iconary` (our private icon package, built from
  `~/projects/design-icons`) from **GitHub Packages** — a private npm registry.
  Root `.npmrc` authenticates with `${GITHUB_TOKEN}` (scope `read:packages`); no
  token is committed. Usage is data + one renderer:
  `import { Icon } from "@benrobo/iconary/react"` + data from
  `@benrobo/iconary/core/<style>`, rendered `<Icon icon={X} color=... />`.
- **Rejected / removed**: the old local `@app/icons` package + `bun icons:add`
  CLI (vendored SVGs in-repo — deleted); `lucide-react` (style mismatch);
  committing the built package (leaks paid assets in a public repo).
- **Why the registry**: keeps paid Hugeicons-derived data out of any public
  repo (consumers bring their own token), tree-shakes to near-zero runtime, and
  sidesteps bun's broken private-GitHub-tarball install (registry protocol works).
- iconary itself was re-architected to data-only + a single renderer (dropped
  per-icon component wrappers), cutting the package from 572MB to a 17MB tarball.
  See the `benrobo-iconary` skill for the consumer API.

## Mail: Plunk by default, swappable via `MailProvider`

- **Picked**: `PlunkProvider` with a `MailProvider` interface in
  `services/mail/providers.ts`.
- **Rejected**: hard-coded Resend/Mailgun/Postmark integrations.
- **Why**: every codebase ended up swapping providers at least once. The
  interface keeps that a five-line change.
