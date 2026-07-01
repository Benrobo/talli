# Glossary

Terms that mean something specific in this codebase.

| Term | Meaning |
|---|---|
| **Engine** | The Hono + Prisma + Trigger.dev service in `services/engine/`. The single backend process that handles HTTP, sockets, cron, and tasks. |
| **Web** | The TanStack Router SPA in `apps/web/`. The authenticated product UI. |
| **Marketing** | The Next.js site in `apps/marketing/`. Public, SEO-tuned, no auth. |
| **Feature id** | A string key understood by ModelKit (e.g. `ai.text.summarize`) that lets admins override the model + temperature + maxTokens for a single AI call site without redeploying. |
| **Session** | The `AuthSession` row in Postgres tied to a JWT. Sessions are revocable; tokens are not. |
| **Auth cookie** | The httpOnly cookie set by `authController.verifyOtp`. Defaults to `app_auth` (override in `@app/shared/constants`). |
| **Refresh cookie** | Sibling cookie holding the long-lived refresh token. Defaults to `app_refresh`. |
| **Validated data** | The Zod-parsed body, query, or params attached to the Hono context by the `validateSchema` family of middleware. Read with `c.get("validatedData" \| "validatedQuery" \| "validatedParams")`. |
| **Deferred notification** | A notification queued in the `notif:pending` Redis ZSET with a `dispatchAt` timestamp; drained by the cron `process-notifications` job. |
| **Immediate notification** | A notification dispatched as soon as `enqueueNotification` is called, deduped for 60 seconds against the `(type, actor, recipient)` triple. |
| **Pipeline logger** | `pipelineLogger({ useTrigger })` — a wrapper that routes logs through either the in-process Winston logger or the Trigger.dev run logger, depending on context. |
| **Tone** | The duotone secondary color, applied to icons via `--icon-tone` on the SVG element. Falls back to `currentColor` when unset. |
| **Cn** | The `cn(...)` utility from `@app/ui` — `clsx` composed with `tailwind-merge`. Use it everywhere you compose `className`. |
| **Skill** | A `SKILL.md` document under `.agents/skills/` (or `.agents/skills-cursor/`) that an AI agent loads on demand. |
| **Memory** | The repo-local notes under `memory/` — durable, project-specific knowledge for AI agents. Distinct from skills, which are reusable across projects. |
