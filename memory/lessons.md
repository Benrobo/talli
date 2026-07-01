# Lessons

Bugs and surprises we already paid for. New entries land at the top.

## Don't share a default port between two services

In the savi monorepo both the engine and the waitlist server defaulted to
`PORT=6708`. Running `bun dev` started one and the other crashed on
`EADDRINUSE` with no clear log. Fix: every workspace pins its own default
in `config/env.ts` and `.env.example` reflects it. Engine: 6590. Web: 5173.
Marketing: 3001. Socket: 6591.

## Validate engine env at boot, exit on failure

A missing `JWT_SECRET` once shipped to staging because `process.env` reads
return `undefined` silently. We now `Zod.safeParse(process.env)` in
`config/env.ts` and `process.exit(1)` on a parse error. The first run is
loud; the staging deploys are quiet.

## Cache the auth lookup but not in Redis

The auth middleware calls Postgres + Redis on every request. `cacheAdapter.get(key, true)` skips Redis for the hot path so a Redis blip
doesn't take down logged-in users. Memory-only cache lasts 5 minutes; that
is the SLA for revoking a stolen access token via session deletion.

## ModelKit needs `OPENROUTER_API_KEY` to be useful

Without an API key the engine still boots, but every `ai.generate()` call
fails. `config/modelkit.config.ts` now exposes `modelKit.enabled` so the
admin router only mounts when the key is present, instead of 500-ing on the
admin UI.

## Don't strip `routeTree.gen.ts` from git AND forget the ts-ignore

When `.gitignore` excludes the generated route tree but the file isn't
generated yet (e.g. fresh clone before `bun dev`), TypeScript fails the
type-check pass. The starter ships a hand-rolled stub of `routeTree.gen.ts`
that compiles standalone; the Vite plugin overwrites it on first run.

## Email-send failures must not crash the request

`MailService` no-ops with a warning when `PLUNK_API_KEY` is empty. Don't
throw; account creation should not 500 because dev forgot to set up email.

## LLM JSON parsing requires `cleanLLMJson`

Markdown fences, trailing commas, and surrounding commentary will all break
`JSON.parse`. `cleanLLMJson({ response, requiredFields })` handles every
common failure mode; never call `JSON.parse(response.text)` directly.

## Trigger.dev tasks need a stable `id`

Renaming a task id orphans every queued run. Pick the id deliberately
before the first deploy and never change it. Use namespaces (`render.image`,
`render.video`).

## Don't paste icons inline in components

Once an icon appears inline in a file, every other component that wants the
same icon will re-paste the SVG. Run `bun icons:add <slug>` first; if the
icon doesn't exist in `design-icons` yet, add it there before bringing it
into the package. The single import point keeps tone overrides consistent.

## Metro `projectRoot` for monorepo Expo

(Mobile starter only.) Metro's TreeFS gets confused by hoisted
`node_modules` in a monorepo. Set `config.projectRoot` to the monorepo root
and `config.watchFolders` to the same. Bounta's `metro.config.js` has the
canonical fix.

## Sockets dedupe via `user:${id}` rooms

When a user opens two tabs they get two sockets. Joining a room keyed on
the user id lets `emitToUser` reach both without bookkeeping. Don't try to
deduplicate at the application layer.
