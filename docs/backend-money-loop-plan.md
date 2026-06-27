# Backend plan — the money loop (collections → pay → webhook → credit)

The plan for the next backend slice: turn the plumbing (Nomba SDK, Telegram,
webhook layer) into a working flow. **Backend only — no frontend.** Everything
here is testable with Postman/curl and the existing smoke scripts.

Status: plan, not yet built. Data model already exists
(`collections`, `collection_members`, `payments`, `savings_jars`,
`savings_transactions`, `webhook_events`).

---

## 1. The loop we're building

```
admin creates a collection (dashboard, JWT)
   → bot shows it in chat with a "Pay ₦X" button
   → member taps → bot asks engine to start a payment (internal token)
       → payment.service creates a `payments` row (pending) + Nomba checkout order
       → member pays on the Nomba hosted page
   → Nomba fires payment_success webhook
       → webhook verifies + records, finds the payments row by ref,
         credits the member, marks paid
   → bot announces "✅ X paid ₦Y. Paid: N" in the chat
```

Two rails already exist (Nomba SDK, Telegram). This slice is the **business
logic in the middle** plus the endpoints to drive it.

---

## 2. Auth model — two kinds of caller

Decided: **JWT for dashboard, internal token for bot/machine routes.**

| Caller | Auth | Used for |
|---|---|---|
| Dashboard (logged-in user) | existing `isAuthenticated` (JWT) | create/list/manage collections, jars |
| Bot / internal services | **new internal token** | resolve a member on pay-tap, start a payment, internal status |
| Nomba | HMAC signature (already done) | the webhook only |

### 2.1 Internal token

- New env: `INTERNAL_API_TOKEN` (Zod, in `env.ts` + `.env.example`).
- New middleware `isInternal` in `middleware/auth.ts`: checks header
  `X-Internal-Token` against `env.INTERNAL_API_TOKEN` with a constant-time
  compare (`safeEqual`). 401 on mismatch/missing. Returns 503 if the token is
  unset, so a misconfig fails loud.
- The Telegram handlers run **in-process** (same engine), so they can call the
  services directly — but we still expose the internal HTTP endpoints so the bot
  path is testable in isolation and ready if the bot ever moves out of process.

---

## 3. Services to build (logic lives here, controllers stay thin)

### 3.1 `collection.service.ts`
- `createCollection(workspaceId, userId, input)` → `collections` row (status
  `draft`/`active`). `collectionType`: `fixed_per_person | open_contribution |
  named_members`.
- `addMember(collectionId, { displayName, platformUserId?, expectedAmount })` —
  used for `named_members`.
- `upsertMember(collectionId, { platform, platformUserId, displayName })` — the
  pay-to-enroll path: first tap creates the member (handoff §12.6). Returns the
  member with its `expectedAmount`.
- `creditMember(memberId, amount)` — add to `paidAmount`, recompute member
  status (`paid`/`underpaid`/`overpaid`) and the collection rollup
  (`partially_paid`/`paid`). Returns progress (paid count, chat id, member name)
  for the bot announcement. **Idempotent + atomic** (transaction).
- `getCollection` / `listCollections(workspaceId)` for the dashboard.

### 3.2 `payment.service.ts` — the Nomba SDK glue
Chain: `route → payment.service → nomba SDK`. No Talli rules in the SDK; they
live here.
- `startCollectionPayment({ collectionId, memberId, amount, platform, platformUserId })`:
  1. build `ref = talli_<collectionId>_<memberId>` (the idempotency key)
  2. create a `payments` row (status `pending`) holding the cross-ref
     (`collectionId`, `collectionMemberId`, `payerPlatformId`, `providerReference`)
  3. `nomba.checkout.createOrder({ orderReference: ref, amount, customerEmail, callbackUrl })`
  4. return `{ checkoutLink, ref }`
- `findByRef(ref)` / `markSuccessful(paymentId, paidAt)` / `markFailed`.
- Idempotency: a ref that already has a successful payment is a no-op.
- (Savings funding reuses the same create-order path with `savingsJarId` set
  instead of `collectionId` — add `startJarFunding` when we do savings.)

### 3.3 `services/webhook/nomba.wh.service.ts` (already stubbed → fill in `process`)
- On `payment_success`: read `merchantTxRef` (== our ref) → `payment.findByRef`
  → if already successful, stop (idempotent) → `markSuccessful` →
  `collection.creditMember` → hand the progress to the bot to announce.
- On `payout_*`: relevant later for Send mode; log for now.
- Already does: signature verify, raw store in `webhook_events`, dedupe on
  `requestId`.

### 3.4 Bot announcement
- The webhook calls `telegram.sendMessage(chatId, messages.paymentConfirmed(...))`
  using the existing UI layer. Bot send failures must not fail the webhook
  (notification retry is separate) — wrap in try/catch.

---

## 4. Endpoints

### 4.1 Dashboard (JWT — `isAuthenticated`)
```
POST   /api/collections                 create a collection
GET    /api/collections                 list (active workspace)
GET    /api/collections/:id             one collection + members + progress
POST   /api/collections/:id/members     add a named member
PATCH  /api/collections/:id             update status (close/cancel)
```

### 4.2 Internal (bot/machine — `isInternal`, `X-Internal-Token`)
```
POST   /api/internal/collections/:id/members/resolve
         body { platform, platformUserId, displayName }
         → upsert member, return member + expectedAmount   (pay-to-enroll tap)
POST   /api/internal/payments/checkout
         body { collectionId, memberId, platform, platformUserId }
         → start payment, return { checkoutLink, ref }
GET    /api/internal/payments/:ref       payment status by ref (debug/poll)
```

### 4.3 Webhook (already mounted)
```
POST   /api/webhook/nomba                Nomba → credit (HMAC verified)
```

Files: `collection.controller.ts` + `collection.route.ts`,
`payment.controller.ts` + `payment.route.ts` (internal), schemas under
`schemas/`. Register both routers in `server.ts`.

---

## 5. The bot pay-tap path (in-process, no HTTP)

The `pay:<collectionId>` callback already decodes in `callback.handler.ts`.
Wire it to:
1. `collection.upsertMember` from `ctx.from` (the tap is the trusted identity).
2. `payment.startCollectionPayment(...)` → `checkoutLink`.
3. `ctx.answerCallbackQuery({ url: checkoutLink })` to open the pay page.

Because the bot is in-process it calls the services directly; the
`/api/internal/*` endpoints mirror the same calls for isolated testing.

---

## 6. Build order (each step testable before the next)

1. **Internal auth** — `INTERNAL_API_TOKEN` env + `isInternal` middleware. Test:
   a dummy internal route returns 401 without the header, 200 with it.
2. **collection.service + dashboard endpoints** — create/list/get. Test via
   Postman with a JWT.
3. **payment.service + internal checkout endpoint** — start a real sandbox
   checkout, confirm a `payments` row + a real `checkoutLink` come back.
4. **Wire the Nomba webhook** — `process` credits the member. Test by POSTing a
   signed `payment_success` (a script signs it with `NOMBA_WEBHOOK_SECRET`).
5. **Bot pay-tap** — tapping the button in a linked chat returns a pay link.
6. **Savings jars** (next slice) — create jar, fund (reuse checkout), withdraw
   (transfer). Same shape as collections.

---

## 7. Postman updates (kept in lockstep)

Add to `postman/talli-engine.postman_collection.json`:
- New collection variables: `internalToken`, `collectionId`, `memberId`,
  `paymentRef`, `checkoutLink`.
- New folders:
  - **Collections** (JWT): Create / List / Get / Add member / Update status —
    test scripts capture `collectionId`.
  - **Internal** (`X-Internal-Token`): Resolve member, Start checkout (captures
    `checkoutLink` + `paymentRef`), Get payment by ref.
  - **Webhook**: Nomba payment_success (a pre-request script signs the body with
    the webhook secret so it passes verification).
- Update the environment file with `internalToken`.
- Re-push to Postman via MCP after each milestone (as in handoff §3.4).

---

## 8. Out of scope for this slice

- Frontend / dashboard UI (explicitly deferred — backend first).
- Send mode / payouts (transfers) — after collections + savings.
- WhatsApp (same services, different channel adapter) — after Telegram path works.
- Refunds (no verified Nomba endpoint yet).
