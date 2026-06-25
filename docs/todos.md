# Talli — Project TODOs

Task tracker for taking the **ai-fullstack-starter** codebase to a working **Talli MVP** as defined in [`talli-prd.md`](./talli-prd.md).

**Last updated:** 2026-06-25

---

## Status legend

| Emoji | Meaning |
|---|---|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Done |
| ⏸️ | Blocked (waiting on external dependency) |
| ❌ | Out of MVP scope (explicitly won't do) |

---

## Starter kit baseline (already in repo)

These ship with the starter and do **not** need to be rebuilt — only extended where noted.

| Item | Status |
|---|---|
| Bun + Turborepo monorepo | ✅ |
| Hono engine (`services/engine`) | ✅ |
| Prisma + PostgreSQL (`services/engine/src/prisma/`) | ✅ |
| Redis (cache, rate limit, sessions) | ✅ |
| JWT auth via OTP email (`/api/auth/*`) | ✅ |
| TanStack Router web SPA (`apps/web`) | ✅ |
| TanStack Query + axios API client | ✅ |
| AI generation via OpenRouter (`services/engine/src/services/ai/`) | ✅ |
| Socket.IO server | ✅ |
| Trigger.dev scaffold | ✅ |
| Notification queue + cron | ✅ |
| Marketing site (`apps/marketing`) | ✅ |
| Agent memory + skills (`memory/`, `.agents/`) | ✅ |

> **Note:** The PRD mentions Drizzle ORM. This starter uses **Prisma**. Keep Prisma — do not migrate ORMs unless there is a strong reason.

---

## Phase 0 — Codebase & local environment

### 0.1 Project identity

- ✅ Rename root `package.json` name/description from `ai-fullstack-starter` to `talli`
- ✅ Update `README.md` with Talli product summary, hackathon context, and Nomba/Telegram setup pointers
- ✅ Update `apps/marketing` copy (hero, meta tags) to reflect Talli positioning
- ✅ Add `docs/todos.md` link from README (this file)

### 0.2 Local infrastructure

- ⬜ Install Bun (`bun@1.2.19` per `packageManager` field)
- ✅ Run `bun install` at repo root
- ✅ Copy env files:
  - `cp .env.example .env`
  - `cp services/engine/.env.example services/engine/.env`
- ⬜ Start PostgreSQL (port `5433` per `.env.example`) — local install or Docker
- ⬜ Start Redis (`redis://localhost:6379`)
- ⏸️ Run `bun db:migrate` to apply starter auth schema — ✅ done (`add_talli_domain`)
- ⬜ Verify dev stack: `bun dev` → web **https://talli.localhost** (portless), engine `7291`, marketing `7195`
- ⬜ Confirm auth flow works end-to-end (request OTP → verify → land on `/dashboard`)

### 0.3 Talli-specific environment variables

Add to `services/engine/.env.example` and `services/engine/src/config/env.ts`:

- ✅ `NOMBA_ENV` — `test` | `live`
- ✅ `NOMBA_CLIENT_ID`
- ✅ `NOMBA_PRIVATE_KEY`
- ✅ `NOMBA_PARENT_ACCOUNT_ID`
- ✅ `NOMBA_SUB_ACCOUNT_ID`
- ✅ `NOMBA_WEBHOOK_SECRET` (if Nomba provides one for signature verification)
- ✅ `TELEGRAM_BOT_TOKEN`
- ✅ `TELEGRAM_BOT_USERNAME` (e.g. `TalliBot`)
- ✅ `TELEGRAM_WEBHOOK_SECRET` (optional path token for webhook URL)
- ✅ `WHATSAPP_ACCESS_TOKEN`
- ✅ `WHATSAPP_PHONE_NUMBER_ID`
- ✅ `WHATSAPP_VERIFY_TOKEN` (for Meta webhook verification handshake)
- ✅ `WHATSAPP_APP_SECRET` (for signature verification)
- ✅ `CHAT_LINK_CODE_TTL_MINUTES` (default `15`)
- ✅ `PAYMENT_PAGE_BASE_URL` (defaults to `WEB_APP_URL`)
- ✅ `PUBLIC_API_URL` (tunnel engine hostname for webhooks)

Reference credentials: [`docs/nomba-test-credentials.md`](./nomba-test-credentials.md)

### 0.4 External account provisioning

- ⬜ Create Telegram bot via [@BotFather](https://t.me/BotFather); save token
- ⬜ Enable Telegram bot for groups (BotFather `/setprivacy` → Disable if bot must read all group messages)
- ⬜ Register Nomba webhook URL via [Nomba webhook form](https://forms.gle/hKfBRHZiTGvU7LC59) with sub-account ID — use `https://p7291.benlabtest.space/api/nomba/webhook`
- ⬜ Set up WhatsApp Business Cloud API app (Meta Developer) — private chat only for MVP
- ⬜ Ensure `OPENROUTER_API_KEY` is set for command parsing
- ⬜ Ensure `PLUNK_API_KEY` (or mail provider) is set for OTP emails
- ✅ Cloudflare Tunnel configured — engine only (`p7291.benlabtest.space`), see `scripts/tunnel-push.sh`
- ✅ Portless dev for web — `apps/web/portless.json`, `https://talli.localhost` (same pattern as mood-world)

**Tunnel hostnames (engine only, DNS registered):**

| URL | Local |
|---|---|
| https://p7291.benlabtest.space | Engine `:7291` (webhooks) |

Web app: **https://talli.localhost** (portless — see `apps/web/portless.json`)

Start tunnel: `cloudflared tunnel run my-tunnel`

### 0.5 Feature flags

Extend `services/engine/src/config/feature-flags.ts`:

- ✅ Add `workspaces`
- ✅ Add `telegram`
- ✅ Add `whatsapp`
- ✅ Add `collections`
- ✅ Add `savings`
- ✅ Add `nomba`
- ✅ Add `bot_commands`
- ⬜ Wire `requireFeature(...)` on all new routes (Phase 3+)

---

## Phase 1 — Database schema (Prisma)

Create domain files under `services/engine/src/prisma/schema/` and migrate.

### 1.1 Extend existing models

- ✅ Add `phone String?` to `User` model
- ✅ Starter `UserRole` stays for platform admins; workspace roles in `workspace_members`

### 1.2 Core domain tables

- ✅ **`workspaces`**
- ✅ **`workspace_members`**
- ✅ **`linked_chats`**
- ✅ **`chat_link_codes`**

### 1.3 Bot & commands

- ✅ **`bot_commands`**

### 1.4 Collections

- ✅ **`collections`**
- ✅ **`collection_members`**

### 1.5 Payments & savings

- ✅ **`payments`** (includes `collectionMemberId` for member-level checkout)
- ✅ **`savings_jars`**
- ✅ **`savings_transactions`**

### 1.6 Observability

- ✅ **`webhook_events`**
- ✅ **`audit_logs`**

### 1.7 Indexes & constraints

- ✅ Unique index on `webhook_events.providerEventId`
- ✅ Unique on `linked_chats (platform, platformChatId)`
- ✅ Unique on `workspaces.slug`
- ✅ Indexes on collections, payments, collection_members, audit_logs

### 1.8 Migration & seed

- ✅ Run `bun db:migrate` — migration `20260625020841_add_talli_domain`
- ⬜ Optional: seed script for demo workspace + test user
- ✅ Document schema in `memory/architecture.md`

---

## Phase 2 — Shared types & packages

File: `packages/shared/src/`

- ⬜ Add workspace, chat, collection, payment, savings, webhook, audit TypeScript types
- ⬜ Add enums mirroring Prisma enums (platform, chat type, collection status, payment status, etc.)
- ⬜ Add bot intent types (`verify_chat`, `create_collection`, `fund_savings_jar`, etc.)
- ⬜ Add API response shapes for list/detail endpoints
- ⬜ Add currency formatting helpers (NGN / kobo conversion)
- ⬜ Add chat link code format constants (e.g. `KOL-XXXX` pattern)
- ⬜ Export from `packages/shared/src/index.ts`

---

## Phase 3 — Backend: Workspaces & permissions

### 3.1 Schemas (`services/engine/src/schemas/`)

- ⬜ `workspace.schema.ts` — create, update, list query
- ⬜ `workspace-member.schema.ts` — invite, update role, remove

### 3.2 Controllers & routes

- ⬜ `workspace.controller.ts`
- ⬜ `workspace.route.ts`:
  - `POST /workspaces` — create workspace (creator becomes owner)
  - `GET /workspaces` — list user's workspaces
  - `GET /workspaces/:workspaceId` — get workspace detail
  - `PATCH /workspaces/:workspaceId` — update name, currency, settings
  - `DELETE /workspaces/:workspaceId` — owner-only soft delete / archive
- ⬜ Workspace member routes:
  - `POST /workspaces/:workspaceId/members` — add member
  - `PATCH /workspaces/:workspaceId/members/:memberId` — change role
  - `DELETE /workspaces/:workspaceId/members/:memberId` — remove member
- ⬜ Register routes in `server.ts`
- ⬜ Permission helper: `requireWorkspaceRole(workspaceId, ['owner', 'admin'])`
- ⬜ Permission helper: `requireWorkspaceMember(workspaceId)`

### 3.3 Business rules

- ⬜ One user can own multiple workspaces
- ⬜ Slug auto-generated from name; collision handling
- ⬜ Owner cannot be removed without ownership transfer
- ⬜ Only owner can unlink groups / request payout (post-MVP)

---

## Phase 4 — Backend: Chat linking & verification

### 4.1 Schemas

- ⬜ `chat.schema.ts` — generate link code, verify chat payload
- ⬜ `chat-link-code.schema.ts`

### 4.2 Link code service

- ⬜ Generate human-readable codes (e.g. `KOL-8F29`)
- ⬜ Hash codes before storage (`codeHash`)
- ⬜ Enforce TTL (default 15 minutes)
- ⬜ Enforce one-time use (`usedAt`)
- ⬜ Scope codes to workspace + platform + purpose

### 4.3 Routes

- ⬜ `POST /workspaces/:workspaceId/link-codes` — generate private or group link code
- ⬜ `POST /chats/verify` — internal/service endpoint called by bot layer after user sends code
- ⬜ `GET /workspaces/:workspaceId/chats` — list linked chats
- ⬜ `DELETE /workspaces/:workspaceId/chats/:chatId` — owner-only unlink

### 4.4 Verification flows

- ⬜ **Telegram private:** user sends `/start KOL-9281` → link `platformUserId` to workspace owner/member
- ⬜ **Telegram group:** admin sends `@Talli verify KOL-8F29` → link `chat_id`, store verifier as admin
- ⬜ **WhatsApp private:** user sends verification code → link phone / WhatsApp user ID
- ⬜ Reject financial commands in unverified chats
- ⬜ Audit log every link / unlink event

---

## Phase 5 — Backend: Telegram bot

### 5.1 Telegram client service

- ⬜ `services/engine/src/services/telegram/index.ts` — send message, edit message, inline keyboard helpers
- ⬜ Handle rate limits and API errors gracefully

### 5.2 Webhook route

- ⬜ `POST /telegram/webhook` — receive Telegram updates (register outside `/api` prefix or mount at root in `app.ts`)
- ⬜ Validate webhook secret / path token if configured
- ⬜ Parse update types: `message`, `callback_query`, `my_chat_member` (bot added to group)

### 5.3 Message routing

- ⬜ Detect private vs group chat
- ⬜ Extract `@Talli` mentions in groups
- ⬜ Route to command handler pipeline
- ⬜ Handle inline button callbacks (`Create Collection`, `Cancel`, `Pay ₦X`)

### 5.4 Bot setup scripts

- ⬜ Script or docs to call `setWebhook` with production/tunnel URL
- ⬜ Script to call `getWebhookInfo` for debugging
- ⬜ Register bot commands via `setMyCommands` (`/start`, `/help`, `/verify`)

### 5.5 Group member sync

- ⬜ On group link, snapshot current member count (for progress `Paid: X/Y`)
- ⬜ On new member join, optionally add to active collection member list
- ⬜ Map Telegram user IDs to `collection_members.displayName`

---

## Phase 6 — Backend: WhatsApp bot (private chat MVP)

### 6.1 WhatsApp client service

- ⬜ `services/engine/src/services/whatsapp/index.ts` — send text, send interactive buttons (if supported)
- ⬜ Template message handling if required by Meta policy

### 6.2 Webhook routes

- ⬜ `GET /whatsapp/webhook` — Meta verification handshake (`hub.verify_token`)
- ⬜ `POST /whatsapp/webhook` — receive inbound messages
- ⬜ Verify `X-Hub-Signature-256` header

### 6.3 Message routing

- ⬜ Private chat only (reject or ignore group messages)
- ⬜ Route verification codes and savings/collection commands to same pipeline as Telegram
- ⬜ Fallback: if WhatsApp setup is blocked for hackathon, document simulated webhook injector for demo

---

## Phase 7 — Backend: AI command parser

### 7.1 Intent parser service

- ⬜ `services/engine/src/services/bot/intent-parser.ts`
- ⬜ Structured JSON output schema (Zod) for all MVP intents:
  - `verify_chat`
  - `create_collection`
  - `confirm_collection`
  - `cancel_collection`
  - `collection_status`
  - `list_unpaid_members`
  - `remind_unpaid_members`
  - `create_savings_jar`
  - `fund_savings_jar`
  - `savings_status`
  - `show_receipt`
  - `help`
- ⬜ Use existing `generate()` + `cleanLLMJson()` pattern
- ⬜ Low temperature (0.1–0.3) for deterministic parsing
- ⬜ Nigerian English / pidgin tolerance ("abeg collect 2k from everybody")
- ⬜ Amount parsing: `2k`, `₦2,000`, `2000 naira`
- ⬜ Confidence threshold — ask clarification below threshold

### 7.2 Command orchestrator

- ⬜ `services/engine/src/services/bot/command-handler.ts`
- ⬜ Persist every inbound command to `bot_commands`
- ⬜ Map intent → handler function
- ⬜ Enforce role checks before executing financial intents
- ⬜ Require confirmation step before creating collections / initiating payments
- ⬜ **AI must never call Nomba or move money directly**

### 7.3 Reply formatter

- ⬜ `services/engine/src/services/bot/reply-formatter.ts`
- ⬜ Treasurer tone: friendly, direct, low-noise (per PRD §17)
- ⬜ Progress lines: `Paid: 4/12`, `₦12,000 / ₦36,000`
- ⬜ Inline keyboard builders for confirmation and payment CTAs

### 7.4 Pending confirmation state

- ⬜ Store pending collection confirmations (Redis or DB) keyed by chat + user
- ⬜ Expire pending confirmations after TTL
- ⬜ Handle `confirm` / `cancel` button callbacks

---

## Phase 8 — Backend: Collections

### 8.1 Schemas

- ⬜ `collection.schema.ts` — create, update status, list query, remind

### 8.2 Collection service

- ⬜ Create collection from parsed intent (after confirmation)
- ⬜ Support MVP type: **fixed-per-person** (primary)
- ⬜ Support MVP type: **named-member** (secondary)
- ⬜ Defer **open contribution** to "Could Have" unless time permits
- ⬜ Auto-populate `collection_members` from group members for `all_group_members` scope
- ⬜ Status transitions: `draft → active → closed / expired / cancelled`
- ⬜ Compute totals: collected, remaining, paid count

### 8.3 Routes

- ⬜ `POST /collections` — create (also triggered by bot after confirmation)
- ⬜ `GET /collections/:collectionId` — detail with members
- ⬜ `GET /workspaces/:workspaceId/collections` — list
- ⬜ `POST /collections/:collectionId/close` — admin closes collection
- ⬜ `GET /collections/:collectionId/status` — status summary
- ⬜ `POST /collections/:collectionId/remind` — trigger unpaid reminders

### 8.4 Bot status commands

- ⬜ `who has paid?` / `who has not paid?` — list members by status
- ⬜ `how much remains?` — outstanding amount
- ⬜ `did [name] pay?` — single member lookup
- ⬜ `close collection` — admin only

### 8.5 Reminders (Should Have)

- ⬜ Remind unpaid members via bot DM or group mention
- ⬜ Rate-limit reminders to avoid spam
- ⬜ Optional: scheduled reminder via cron / Trigger.dev

---

## Phase 9 — Backend: Payments & Nomba integration

### 9.1 Nomba client service

- ⬜ `services/engine/src/services/nomba/client.ts`
- ⬜ Auth: parent `accountId` header + sub-account scoping
- ⬜ `createCheckoutOrder()` — create hosted payment page
- ⬜ `verifyTransaction()` — optional fallback if webhook delayed
- ⬜ Environment switch: test vs live credentials from env
- ⬜ Reference: [`docs/nomba-test-credentials.md`](./nomba-test-credentials.md), [Nomba docs](https://developer.nomba.com)

### 9.2 Payment creation flow

- ⬜ `POST /collections/:collectionId/checkout` — create payment for collection member
- ⬜ `POST /savings/jars/:jarId/fund` — create payment for jar deposit
- ⬜ Create `payments` row with status `pending` before redirect
- ⬜ Store Nomba order reference / checkout URL
- ⬜ Return payment URL to web payment page and bot inline button

### 9.3 Web payment page data

- ⬜ `GET /collections/:collectionId/pay/:memberId` or public token — payment context for frontend
- ⬜ Validate payer identity (platform user token or signed link)
- ⬜ Show amount, purpose, workspace name

### 9.4 Post-payment updates

- ⬜ On successful webhook: update `payments.status = successful`
- ⬜ Update `collection_members.paidAmount` and `status`
- ⬜ Update `collections.status` if fully paid
- ⬜ Update `savings_jars.currentAmount`
- ⬜ Create `savings_transactions` row for deposits
- ⬜ Trigger bot notification message

### 9.5 Manual mark-as-paid (demo fallback — Should Have)

- ⬜ Owner/admin endpoint to mark member as paid with audit log
- ⬜ Require reason/note in metadata

---

## Phase 10 — Backend: Nomba webhook handler

### 10.1 Webhook route

- ⬜ `POST /nomba/webhook` (mount at root, not behind auth)
- ⬜ No rate limit that blocks Nomba retries; use idempotency instead

### 10.2 Processing pipeline (per PRD §16)

- ⬜ Receive webhook payload
- ⬜ Store raw payload in `webhook_events` **before** processing
- ⬜ Verify provider signature/header when available
- ⬜ Check `providerEventId` uniqueness — skip duplicates safely
- ⬜ Match payment by `providerReference` / `providerOrderId`
- ⬜ Update payment, collection member, or savings jar in a transaction
- ⬜ Write `audit_logs` entry
- ⬜ Queue bot notification (async; payment success must not depend on bot delivery)
- ⬜ Mark webhook `processingStatus = processed`
- ⬜ On unmatched payment: mark `manual_review`
- ⬜ On invalid signature: mark `failed` / `ignored`

### 10.3 Observability routes

- ⬜ `GET /webhook-events` — list with filters (provider, status, date)
- ⬜ `GET /webhook-events/:id` — detail with raw payload
- ⬜ `GET /audit-logs` — list with workspace filter

---

## Phase 11 — Backend: Savings jars

### 11.1 Schemas

- ⬜ `savings.schema.ts` — create jar, fund, list, lock

### 11.2 Savings service

- ⬜ Create jar from bot command or dashboard
- ⬜ Fund jar via Nomba checkout (same payment pipeline)
- ⬜ Track `currentAmount` vs `targetAmount`
- ⬜ Lock jar until `lockUntil` date (status `locked`)
- ⬜ Prevent withdrawal in MVP (or owner-only post-MVP)

### 11.3 Routes

- ⬜ `POST /savings/jars`
- ⬜ `GET /savings/jars/:jarId`
- ⬜ `GET /workspaces/:workspaceId/savings/jars`
- ⬜ `POST /savings/jars/:jarId/fund`

### 11.4 Bot commands

- ⬜ `Create a jar for rent, target ₦200,000`
- ⬜ `Save ₦2,000 to rent jar`
- ⬜ `How much is in my rent jar?`
- ⬜ `Lock ₦10,000 until July 30` (store lock rule; payment still via checkout)

---

## Phase 12 — Web dashboard (TanStack Router)

Replace starter placeholder dashboard with Talli control center. Add routes under `apps/web/src/routes/`.

> **UI status:** All screens from `docs/talli-artifacts` are built with Tailwind
> (no inline styles, `cn()` merges, duotone/twotone/solid icons via `@app/icons`).
> Design tokens live in `packages/tailwind-config/globals.css` (iris/night/amber/
> rose + shadows + Instrument Serif / Roboto / Roboto Mono). Global primitives in
> `apps/web/src/components/{ui,layout,brand}`; domain code in
> `apps/web/src/modules/<domain>/{components,util}`; **mock data is global in
> `apps/web/src/data/mock/*.ts`** and types in each `modules/<domain>/types.ts`.
> Screens currently render mock data — wiring to real APIs (12.4) is the remaining work.

### 12.1 Layout & navigation

- ✅ App shell with sidebar: Home, Collections, Savings jars, Money sent, Receipts, Linked chats, Settings (`components/layout/`)
- ✅ Workspace switcher in sidebar footer
- ⬜ Breadcrumbs for nested routes (not in design; add if needed)
- ✅ Add required icons via `bun icons:add` (jar, group, send, invoice, bank, card, brand glyphs, etc.) + `solid-rounded` style support added to the CLI

### 12.2 Onboarding / connect a chat

- ✅ `/setup` — connect-a-chat flow (platform picker + link code + "connected" success state) — `modules/chats/components/connect-page.tsx`
- ⬜ Step: Create workspace (name, currency) — currently lives in Settings; add as first-run step if needed
- ✅ Choose platforms (WhatsApp private, Telegram private/group)
- ✅ Display verification link code with copy button + expiry countdown copy
- ⬜ Wire code generation to backend (`/chats` link-code endpoint)

### 12.3 Core routes (built UI, mock data)

- ✅ `/` — redirects to `/home`
- ✅ `/home` — overview: saved/collecting/sent stats, active collection, jars, recent activity
- ✅ `/collections` — list (live / closed / draft)
- ✅ `/collections/$slug` — detail: members roster, progress, paid/unpaid, actions
- ✅ `/savings` — jars grid with progress rings
- ✅ `/savings/$id` — jar detail + recent deposits
- ✅ `/savings/new` — create jar form
- ✅ `/sent` — money sent (transfers typed in chat)
- ✅ `/receipts` — receipts table + export
- ✅ `/chats` — linked chats list
- ✅ `/settings` — workspace, permissions, bot tone, danger zone
- ✅ `/auth` — restyled OTP sign-in
- ⬜ `/webhooks` — webhook event log viewer (not in design artifacts; add for ops)
- ⬜ `/audit-logs` — audit log viewer (not in design artifacts; add for ops)

### 12.4 API client layer

- ⬜ `apps/web/src/lib/workspaces.ts`
- ⬜ `apps/web/src/lib/collections.ts`
- ⬜ `apps/web/src/lib/savings.ts`
- ⬜ `apps/web/src/lib/chats.ts`
- ⬜ `apps/web/src/lib/webhooks.ts`
- ⬜ TanStack Query hooks for each resource (list, detail, mutations)

### 12.5 Key UI screens

- ✅ Workspace settings form (name, currency, permissions, bot tone, danger zone)
- ✅ Link code generator UI with expiry copy (`/setup`)
- ✅ Linked chats list (platform, type, title, status, manage)
- ✅ Collection detail with member payment roster and progress bars
- ✅ Savings jar cards with conic progress rings + jar detail
- ⬜ Webhook event detail drawer (raw JSON, processing status)
- ⬜ Audit log table with action filters
- ⬜ Member role management (owner/admin/member)

---

## Phase 13 — Payment & receipt pages (public-facing)

These routes may be accessible without full auth (signed token or payment session).
The router treats `/pay/*` as public (`__root.tsx` PUBLIC_PATHS).

- ✅ `/pay/$reference` — payment page UI (purpose, amount, pay-with methods) — mobile-friendly
- ✅ Show collection title, amount, payer name
- ⬜ "Pay now" button → wire to Nomba hosted checkout (currently links to receipt)
- ⬜ Loading / error states for failed checkout creation
- ✅ `/pay/$reference/receipt` — payment confirmed receipt page UI
- ⬜ `/savings/:jarId/pay` — jar funding payment page (reuse PayPage)
- ⬜ Success / failure return URLs from Nomba (informational only — webhook is source of truth)
- ✅ Mobile-friendly layout via `MobileScreen` (most users come from chat on phone)

---

## Phase 14 — Background jobs & notifications

### 14.1 Trigger.dev tasks

- ⬜ `send-bot-notification.task.ts` — retry failed Telegram/WhatsApp messages
- ⬜ `process-webhook.task.ts` — optional async webhook processing for heavy loads
- ⬜ `send-collection-reminder.task.ts` — scheduled unpaid reminders
- ⬜ `expire-collections.task.ts` — mark collections past deadline as `expired`

### 14.2 Cron jobs

- ⬜ Expire unused chat link codes (cleanup)
- ⬜ Expire pending bot confirmations
- ⬜ Collection deadline checker

### 14.3 Realtime (optional enhancement)

- ⬜ Socket.IO event `payment:confirmed` for live dashboard updates
- ⬜ Push collection progress updates to connected workspace admins

---

## Phase 15 — Security & compliance

- ⬜ All financial routes require authenticated user or verified platform identity
- ⬜ Role checks on collection creation (owner/admin only in groups)
- ⬜ Rate limit OTP, link code generation, and webhook-adjacent endpoints
- ⬜ Never trust frontend payment success redirect as final confirmation
- ⬜ Hash chat link codes at rest
- ⬜ Sanitize bot command logs (no secrets in `rawText` storage)
- ⬜ CORS: add production web URL to `internal-config.ts`
- ⬜ Ensure Nomba private keys and bot tokens are never exposed to frontend
- ⬜ Add `memory/lessons.md` entry for webhook idempotency pattern after implementation

---

## Phase 16 — Testing & hackathon demo prep

### 16.1 Manual test checklist

- ⬜ Sign up → create workspace → generate Telegram group code
- ⬜ Add bot to Telegram group → `@Talli verify CODE` → confirmation message
- ⬜ `@Talli collect ₦3,000 from everyone for Saturday football by Friday` → confirmation buttons
- ⬜ Confirm → payment button posted in group
- ⬜ Member clicks Pay → Nomba test checkout → complete payment
- ⬜ Webhook fires → member marked paid → bot announces in group
- ⬜ `@Talli who hasn't paid?` → correct list
- ⬜ `@Talli how much remains?` → correct amount
- ⬜ Private chat: `Save ₦2,000 to rent jar` → pay → jar balance updates
- ⬜ Dashboard shows payment, webhook event, and audit log entries

### 16.2 Demo script rehearsal (PRD §18)

- ⬜ Scene 1: Web setup — create "Benaiah Football Club" workspace
- ⬜ Scene 2: Link Telegram group
- ⬜ Scene 3: Create collection from natural language
- ⬜ Scene 4: Member pays via Nomba
- ⬜ Scene 5: Status questions in group
- ⬜ Scene 6: Private savings jar funding
- ⬜ Prepare fallback recording / screenshots if live demo network fails

### 16.3 Edge cases

- ⬜ Duplicate webhook delivery → no double credit
- ⬜ Payment for wrong collection member → rejected or manual review
- ⬜ Expired link code → friendly error
- ⬜ Unverified chat financial command → refused with instructions
- ⬜ Low-confidence AI parse → clarification question

---

## Phase 17 — Deployment

### 17.1 Infrastructure

- ⬜ Choose hosting: engine (Railway, Fly.io, Render, VPS, Cloudflare Workers if adapted)
- ⬜ Managed PostgreSQL (Neon, Supabase, Railway)
- ⬜ Managed Redis (Upstash, Railway)
- ⬜ Production env vars for all secrets
- ⬜ Run `bun db:deploy` on production database

### 17.2 Web apps

- ⬜ Deploy `apps/web` (Vite static → Cloudflare Pages, Vercel, or similar)
- ⬜ Deploy `apps/marketing` (Next.js → Vercel)
- ⬜ Set `WEB_APP_URL`, `CLIENT_URL`, `PAYMENT_PAGE_BASE_URL` to production URLs
- ⬜ Update CORS origins in `internal-config.ts`

### 17.3 Webhooks in production

- ⬜ Register production URL with Telegram `setWebhook`
- ⬜ Register production URL with Nomba webhook form
- ⬜ Register production URL with Meta WhatsApp webhook
- ⬜ Verify all three providers reach the deployed endpoints

### 17.4 CI

- ⬜ GitHub Actions: `bun install`, `bun type-check`, `bun build`
- ⬜ Optional: `bun db:deploy` in deploy pipeline
- ⬜ Optional: Trigger.dev deploy via `bun --filter @app/engine trigger:deploy`

---

## MVP scope checklist (from PRD §10)

### Must Have

| # | Requirement | Status |
|---|---|---|
| 1 | Web dashboard onboarding | ⬜ |
| 2 | Workspace creation | ⬜ |
| 3 | Telegram private chat linking | ⬜ |
| 4 | Telegram group linking | ⬜ |
| 5 | WhatsApp private chat linking (or simulated fallback) | ⬜ |
| 6 | Natural language command parser | ⬜ |
| 7 | Create collection from Telegram group | ⬜ |
| 8 | Pay collection through Nomba Checkout | ⬜ |
| 9 | Nomba webhook handling | ⬜ |
| 10 | Collection status updates in Telegram | ⬜ |
| 11 | Private savings jar creation | ⬜ |
| 12 | Fund savings jar through Nomba Checkout | ⬜ |
| 13 | Payment/webhook event log | ⬜ |
| 14 | Basic role checks | ⬜ |
| 15 | Confirmation before financial actions | ⬜ |

### Should Have

| # | Requirement | Status |
|---|---|---|
| 1 | Remind unpaid members | ⬜ |
| 2 | Receipt page | ⬜ |
| 3 | Payment status query | ⬜ |
| 4 | Savings jar progress | ⬜ |
| 5 | Admin dashboard for collection details | ⬜ |
| 6 | Manual mark-as-paid for demo fallback | ⬜ |

### Could Have

| # | Requirement | Status |
|---|---|---|
| 1 | Voice note command parsing | ⬜ |
| 2 | Recurring savings reminders | ⬜ |
| 3 | Open contribution collection | ⬜ |
| 4 | CSV export | ⬜ |
| 5 | Custom payment page branding | ⬜ |
| 6 | WhatsApp production integration | ⬜ |

### Won't Have (MVP)

| # | Requirement | Status |
|---|---|---|
| 1 | Fully autonomous money transfer by AI | ❌ |
| 2 | WhatsApp group bot support | ❌ |
| 3 | Full wallet system | ❌ |
| 4 | Interest-bearing savings | ❌ |
| 5 | Regulated investment features | ❌ |
| 6 | Automated payouts without owner confirmation | ❌ |
| 7 | Complex KYC onboarding | ❌ |
| 8 | Loan/credit products | ❌ |

---

## Recommended build order (dependency-aware)

Follow this sequence to avoid blocked work:

1. ⬜ Phase 0 — Environment & env vars
2. ⬜ Phase 1 — Database schema & migrate
3. ⬜ Phase 2 — Shared types
4. ⬜ Phase 3 — Workspaces API
5. ⬜ Phase 4 — Chat linking & verification
6. ⬜ Phase 5 — Telegram bot webhook
7. ⬜ Phase 7 — AI command parser (basic `help` + `verify_chat` first)
8. ⬜ Phase 8 — Collections (create + status)
9. ⬜ Phase 9 — Nomba checkout integration
10. ⬜ Phase 10 — Nomba webhook handler
11. ⬜ Phase 13 — Payment pages
12. ⬜ Phase 12 — Dashboard (workspaces + chats + collections)
13. ⬜ Phase 11 — Savings jars
14. ⬜ Phase 6 — WhatsApp (or simulated fallback)
15. ⬜ Phase 14–17 — Jobs, security hardening, demo, deploy

---

## External dependencies & blockers

| Dependency | Needed for | Status |
|---|---|---|
| Nomba test credentials | Payments, webhooks | ✅ Available in `docs/nomba-test-credentials.md` |
| Nomba webhook URL registration | Payment confirmation | ⏸️ Requires deployed or tunneled URL |
| Telegram bot token | Group + private chat | ⬜ Create via BotFather |
| WhatsApp Business API | Private chat MVP | ⬜ Meta developer app setup |
| OpenRouter API key | Command parsing | ⬜ Required |
| Plunk / mail provider | OTP auth emails | ⬜ Required for signup |
| Public HTTPS URL | All webhooks | ⏸️ ngrok / deploy |

---

## Files to create (engine)

```
services/engine/src/
├── prisma/schema/talli.prisma
├── schemas/
│   ├── workspace.schema.ts
│   ├── chat.schema.ts
│   ├── collection.schema.ts
│   ├── savings.schema.ts
│   └── payment.schema.ts
├── controllers/
│   ├── workspace.controller.ts
│   ├── chat.controller.ts
│   ├── collection.controller.ts
│   ├── savings.controller.ts
│   ├── payment.controller.ts
│   ├── webhook.controller.ts
│   └── audit.controller.ts
├── routes/
│   ├── workspace.route.ts
│   ├── chat.route.ts
│   ├── collection.route.ts
│   ├── savings.route.ts
│   ├── payment.route.ts
│   ├── telegram.route.ts
│   ├── whatsapp.route.ts
│   ├── nomba-webhook.route.ts
│   └── audit.route.ts
├── services/
│   ├── nomba/client.ts
│   ├── telegram/index.ts
│   ├── whatsapp/index.ts
│   └── bot/
│       ├── intent-parser.ts
│       ├── command-handler.ts
│       └── reply-formatter.ts
└── trigger/
    ├── send-bot-notification.task.ts
    └── send-collection-reminder.task.ts
```

## Files to create (web)

```
apps/web/src/
├── routes/
│   ├── onboarding.tsx
│   ├── workspaces/
│   │   ├── index.tsx
│   │   └── $workspaceId/
│   │       ├── index.tsx
│   │       ├── bot.tsx
│   │       ├── chats.tsx
│   │       └── settings.tsx
│   ├── collections/
│   │   ├── index.tsx
│   │   ├── $collectionId.tsx
│   │   └── $collectionId.pay.tsx
│   ├── savings/
│   │   ├── index.tsx
│   │   └── $jarId.tsx
│   ├── webhooks.tsx
│   └── audit-logs.tsx
├── lib/
│   ├── workspaces.ts
│   ├── collections.ts
│   ├── savings.ts
│   ├── chats.ts
│   └── webhooks.ts
└── components/
    ├── app-shell.tsx
    ├── workspace-switcher.tsx
    ├── collection-progress.tsx
    ├── link-code-card.tsx
    └── payment-member-table.tsx
```

---

## Success criteria (hackathon demo)

- ⬜ Link a Telegram group in under 60 seconds
- ⬜ Create a collection from chat in under 30 seconds
- ⬜ Payment status updates automatically after Nomba webhook
- ⬜ Bot answers at least 5 status questions correctly
- ⬜ User can fund a savings jar from private chat
- ⬜ Web dashboard shows all payments and webhook events clearly

---

*Update emoji status on each task as work progresses. When a phase completes, bump the phase header to ✅.*
