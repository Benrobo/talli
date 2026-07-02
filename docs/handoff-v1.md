# Talli — Handoff v1

Context snapshot so a fresh chat can continue without re-discovery.
**Date:** 2026-06-27 · **Branch:** `main`

---

## 1. What Talli is (one paragraph)

Talli is an **AI treasurer for chat** — collect money, send money, and run
savings jars from inside Telegram (private + group) and WhatsApp (private),
configured from a web dashboard. Payments run on **Nomba**. AI only parses
intent and summarizes; **all money movement is deterministic, role-checked, and
user-confirmed** — never autonomous. Full spec: [`talli-prd.md`](./talli-prd.md).

Three modes: **Collect** (group/individual collections), **Save** (savings jars),
**Send** (P2P-to-bank, collection payouts, jar withdrawals — parse-and-confirm).
Wallet-to-wallet and receipt-based split payment are post-MVP.

---

## 2. Stack & layout

- **Monorepo:** Bun + Turborepo. Engine: `services/engine` (Hono + Prisma +
  Postgres + Redis). Web: `apps/web` (TanStack Router). Marketing: `apps/marketing`.
- **DB:** Prisma, split schema under `services/engine/src/prisma/schema/*.prisma`
  (one domain per file). Tables map to snake_case via `@@map`.
- **PRD says Drizzle but the code uses Prisma** — the code is the source of truth.
- Engine port **7291**; web **7193**; socket **7292**. Dev over portless
  `https://talli.localhost`.

### Engine conventions (important — enforced)

- **Controllers are THIN.** No `prisma`/`redis`/`jwt` in controllers — all logic
  lives in `*.service.ts`. Reference: `auth.service.ts`, `workspace.service.ts`.
  (User pushed back hard on this once; see [`memory/lessons.md`](../memory/lessons.md).)
- Layering: **route → controller → service → integration**.
- File suffixes: `*.controller.ts`, `*.route.ts`, `*.service.ts`, `*.schema.ts`.
- **No inline comments** — JSDoc only, above exported declarations.
- `.js` import extensions (Node ESM). Throw `HttpException` subclasses; let
  `useCatchErrors` translate. Use `logger`, never `console.log`. New env keys go
  in `config/env.ts` (Zod, exits on invalid) + `.env.example`.
- When a reference repo is named, **mirror it exactly**: `~/projects/scribe`
  (clean Hono+Prisma patterns), `~/projects/elorah` (Cloudflare email pattern).

---

## 3. Work completed this session

### 3.1 PRD updated (`talli-prd.md`)
- Added **Send Mode** as a first-class mode + MVP must-have: P2P-to-bank,
  collection payouts, jar withdrawals — **parse-and-confirm only** (LLM proposes,
  deterministic layer executes after explicit confirm).
- Added send intents, `transfers`/`beneficiaries` data model, payout/transfer API
  routes, role rules, safety-principle updates, build-order step.
- **Post-MVP:** wallet-to-wallet (needs custodial wallet), split payment
  (receipt upload → generated pay link).

### 3.2 Auth (OTP-based, working)
- **Refactored controller→service**: all logic now in
  [`services/engine/src/services/auth.service.ts`](../services/engine/src/services/auth.service.ts);
  [`auth.controller.ts`](../services/engine/src/controllers/auth.controller.ts)
  is HTTP-only.
- Flow: `request-otp` → `verify-otp` (upsert user, ensure default workspace,
  create session, set httpOnly cookies + return tokens) → `me` → `logout`.
- **Fixed two real bugs:** (a) logout now clears the `session:<token>` cache key
  *and* deletes the session row (was leaving logged-out tokens valid ~5 min);
  (b) added the missing **`POST /api/auth/refresh`** (refresh was dead code).
- Refresh model = **stateless JWT + session-row check** (chosen). The
  `RefreshToken` table in `auth.prisma` is now **unused/dead** — removable.
- Token TTLs: access 15 min, refresh 30 days.
- Endpoints: `POST /api/auth/request-otp`, `/verify-otp`, `/refresh`;
  `GET /api/auth/me`; `PATCH /api/auth/me` (update display name); `POST /api/auth/logout`.

### 3.3 Email → Cloudflare (elorah pattern), simplified
- Uses Cloudflare email-sending via the `cloudflare` SDK.
- `config/cloudflare/client.ts` + `config/cloudflare/cf-email.ts` (`sendEmail`,
  `from` defaults to `Talli <MAIL_FROM>`).
- **Provider abstraction removed** (user request): no `mail/providers.ts`, no
  Plunk. [`mail.service.ts`](../services/engine/src/services/mail.service.ts)
  calls `sendEmail` directly (adds footer).
- Removed dead `PLUNK_API_KEY` / `MAIL_REPLY_TO` env keys. Added
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- **Tested live**: real send succeeds with a verified sender (`mail@elorah.app`).
  Fails with `email.invalid` if `MAIL_FROM` is an unverified domain (e.g. the
  placeholder `noreply@example.com`) — that's config, not code.

### 3.4 Postman collection
- [`postman/talli-engine.postman_collection.json`](../postman/talli-engine.postman_collection.json)
  + [`postman/talli-local.postman_environment.json`](../postman/talli-local.postman_environment.json).
- Self-contained: tokens stored as **collection variables**; verify-otp/refresh
  test scripts auto-capture them. Works with no environment selected.
- **Pushed to Postman** ("My Workspace", `e5d3fb93-…`). Collection UID
  `54439895-1b447360-4d29-43b5-94b6-6bd92d3f3f61`. Pushed via Postman MCP.
- Earlier 401-on-"me" was a Postman var-scope issue (env not selected / empty var
  shadowing), not a server bug — fixed by moving tokens to collection vars.

### 3.5 Nomba API reference (`nomba-api.md`)
- A "mini Postman in markdown" for the endpoints Talli uses.
- **Verified against the real OpenAPI spec** (`Vendor API` v1.0.0). A first draft
  built from prose docs had real errors; they were corrected by diffing the spec.
  See the **Verification status** table at the top of that file.
- Includes a designed **Talli Nomba SDK** (§11) and two brainstorm sections:
  §12 chat identity/attribution, §13 DM authorization.

---

## 4. Key decisions locked this session

| Topic | Decision |
|---|---|
| Send Mode | In MVP, parse-and-confirm; LLM never moves money autonomously |
| Wallet-to-wallet, split payment | Post-MVP |
| Auth | OTP email only (no Google OAuth yet) |
| Refresh tokens | Stateless JWT + session-row check (no `RefreshToken` table) |
| Email | Cloudflare only, no provider abstraction, no Plunk |
| Nomba SDK location | `services/engine/src/integrations/nomba/` (vendor client, **not** `services/`) |
| Telegram pay UI | Inline keyboard buttons (callback + url). Mini Apps later |
| Payment attribution | `merchantTxRef`/`orderReference` → `payments` row holds `{collectionId, memberId, platform, platformUserId}`; webhook looks it up |
| Identity key | per-platform `platformUserId` (tg `from.id` / `wa_id`); `appUserId` nullable |
| DM authorization | **Gate up front**; **deep link + code** (`t.me/<bot>?start=<code>`); **no auto-provision** (link to a real OTP account) |

---

## 5. Nomba — verified facts (from OpenAPI v1.0.0)

Base URLs: sandbox `https://sandbox.nomba.com`, live `https://api.nomba.com`.
Envelope `{ code, description, data }`, `code "00"` = success (200 ≠ success).
Headers: `Authorization: Bearer`, `accountId`, `Content-Type`.

| Use | Method + path |
|---|---|
| Token | `POST /v1/auth/token/issue` (client_credentials) · refresh · revoke; ~30 min TTL |
| Create checkout | `POST /v1/checkout/order` → `data.checkoutLink` + `data.orderReference` |
| Verify payment | `GET /v1/transactions/accounts/single?orderReference=|merchantTxRef=` |
| Cancel checkout | `POST /v1/checkout/transaction/cancel` `{transactionId, forceCancel}` |
| Virtual account | `POST /v1/accounts/virtual` `{accountRef, accountName}` |
| Bank codes | `GET /v1/transfers/banks` (cache it) |
| Bank lookup | `POST /v1/transfers/bank/lookup` `{accountNumber, bankCode}` → `data.accountName` |
| Transfer to bank | `POST /v1/transfers/bank` (required: amount, accountNumber, accountName, bankCode, merchantTxRef, **senderName**) → `data.meta.merchantTxRef`, `data.meta.rrn`, `data.id`, `data.status` |
| Wallet P2P | `POST /v1/transfers/wallet` `{amount, receiverAccountId, merchantTxRef}` |
| Balance | `GET /v1/accounts/balance` |
| Requery | `GET /v1/transactions/requery/{sessionId}` |

**Unverified (prose only — confirm before building):** checkout **refund** (no
spec path), **Global Payout** (not in spec v1.0.0), **webhook** event names +
signing-string field order (validate against a real sandbox webhook). Transfer
path: spec says `/v1/transfers/bank`; some prose says `/v2/...` — confirm in sandbox.

Transfer status enum: `NEW|PENDING_PAYMENT|PAYMENT_SUCCESSFUL|PAYMENT_FAILED|PENDING_BILLING|SUCCESS|REFUND`.
`merchantTxRef` = idempotency key; **webhook is the authoritative final status**
(NIBSS up to ~3 min). Max 5 transfers to same recipient/min.

### Credentials
Hackathon test creds are in [`docs/nomba-test-credentials.md`](./nomba-test-credentials.md)
(parent account id `f666ef9b-…`, sub-account `4971936c-…`). Env keys already in
`config/env.ts`: `NOMBA_ENV`, `NOMBA_CLIENT_ID`, `NOMBA_PRIVATE_KEY`
(= client_secret), `NOMBA_PARENT_ACCOUNT_ID` (= accountId header),
`NOMBA_SUB_ACCOUNT_ID`, `NOMBA_WEBHOOK_SECRET`.

---

## 6. Build order & current position

Dependency-ordered (PRD §21). **Tier 0 in progress.**

| # | Item | Status |
|---|---|---|
| 0a | **Auth (OTP)** | ✅ done this session |
| 0b | Workspace | ✅ mostly (service exists) |
| 1a | Chat link codes + verification (private DM) | ⬜ designed (§13 of nomba-api.md), not built |
| 1b | Telegram group verification | ⬜ |
| 1c | Telegram bot webhook | ⬜ |
| 1d | WhatsApp webhook | ⬜ |
| 2a | Collections (service/route) | ⬜ schema exists |
| 2b | Savings jars (service/route) | ⬜ schema exists |
| 2c | **Nomba SDK** `integrations/nomba/` | ⬜ designed (§11), not built |
| 2d | Checkout + payment page | ⬜ |
| 2e | Nomba webhook handler | ⬜ |
| 3a | NL command parser (AI → intents) | ⬜ |
| 3b | Send/transfer + payout | ⬜ |
| 3c | Status queries, reminders, dashboards | ⬜ |

**Recommended next:** build the **Nomba SDK** (`integrations/nomba/`, design is in
nomba-api.md §11) — it unblocks checkout, webhooks, transfers — OR **chat linking
+ Telegram webhook** (design in §13). Both are well-specced.

---

## 7. Open questions (need user decision)

1. **"Collect from everyone" roster** — pay-to-enroll (no denominator) vs named
   list (real "who hasn't paid X/Y"). Leaning pay-to-enroll for MVP. (nomba-api.md §12.6)
2. **Nomba unverified endpoints** — refund / global-payout / webhook signature must
   be confirmed against the live sandbox before implementing.
3. Set `MAIL_FROM` in `services/engine/.env` to a Cloudflare-verified sender (the
   placeholder fails sends).

---

## 8. Reference map

| Need | File |
|---|---|
| Product spec | [`docs/talli-prd.md`](./talli-prd.md) |
| Nomba API + SDK design + chat-flow brainstorms | [`docs/nomba-api.md`](./nomba-api.md) |
| Nomba test creds | [`docs/nomba-test-credentials.md`](./nomba-test-credentials.md) |
| Task tracker | [`docs/todos.md`](./todos.md) |
| Engine conventions / lessons | [`memory/conventions.md`](../memory/conventions.md), [`memory/lessons.md`](../memory/lessons.md) |
| Auth implementation | `services/engine/src/{services/auth.service.ts, controllers/auth.controller.ts, middleware/auth.ts, routes/auth.route.ts}` |
| Email | `services/engine/src/services/mail.service.ts`, `config/cloudflare/*` |
| Pattern source repos | `~/projects/scribe`, `~/projects/elorah` |

---

## 9. Gotchas

- `bun run type-check` shows 2 pre-existing errors (`prisma.config.ts`,
  `trigger.config.ts` outside `rootDir`) — **unrelated to our code**, ignore.
- `cloudflare` SDK is hoisted to the repo-root `node_modules` (workspace) — greps
  from inside `services/engine` won't find it; that's normal.
- `COOKIE_SECURE` is true in dev (because `WEB_APP_URL` is https) → auth cookies
  are `Secure` and won't ride over plain `http://localhost:7291`. Use the Bearer
  token in Postman/curl, not cookies.
- Don't commit `.env`. Commit only when the user asks; branch off `main` first.
