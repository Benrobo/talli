# Selective payment (a.k.a. "person picker") — what was built & the target flow

> Analysis of the `feat/selective-payment` branch (merged into `main`), written to
> confirm my understanding of (a) what your partner built and (b) the flow you
> actually want. **Nothing here is changed yet** — this is the shared
> understanding we agree on before refactoring.

---

## 1. The feature in one sentence

A receipt-driven split where the bill's **line items** are shown on a **Talli web
page**, each person **picks the items they're paying for**, and each selection
**generates its own checkout link** — so people pay for exactly what they ordered,
not an even split.

Your partner named it **"person picker"** in code — that name makes no sense and
is going away. **Frame this as rebuilding the bill-splitting infra from scratch:**
this isn't a "picker feature" added beside split modes — it **IS** bill splitting
now. Proposed name everywhere: **`bill_split`** (intent), **`billSplitService`**,
**`BillSplit` / `BillSplitItem` / `BillSplitSelection`** (models),
`/bill-splits/...` (routes). (Final naming = the one open decision in §7.)

---

## 1b. The agreed model (LOCKED — read this first)

We deliberately kept this simple and modelled it on **how people actually split a
restaurant bill**, not on every theoretical edge case.

> **Each receipt line is a single claimable item. A payer ticks the item(s) they
> had (a cart), pays once for the whole selection, and those items then lock —
> greyed out as "✅ Paid by <name>" — for everyone else. No quantities, no unit
> counters.**

The rules, concretely:

- **Cart, not tap-once.** A person can select **multiple items** (jollof + coke +
  water) and **pay for them in one checkout**. One payment covers many items.
- **An item belongs to one paid selection.** Once a selection is **paid**, its
  items are claimed and disabled for everyone.
- **Lock on payment, not on selection.** While someone has items in their cart but
  hasn't paid, those items stay tappable by others. The lock happens only when a
  payment **settles**. If two people race for the same item, the backend rejects
  the second payer's checkout for an already-claimed item with a clean "someone
  just grabbed this" message. (We accept this rare race rather than build cart
  reservations — keeping it simple.)
- **No quantity logic.** A receipt line printed as "Jollof ×3" is treated as one
  claimable line. We optimise for the common case ("I'll pay for what I had"), not
  the corner — since there are no other split modes, edge groups just claim lines
  or sort it among themselves.

Why this shape: real bill-splitting is "everyone pays for what they ordered."
People don't negotiate fractional units off a receipt — they claim their dishes.
Anything more (per-unit tracking, pre-assignment, reservations) solves problems
users don't actually have and multiplies failure modes.

### Scope: the picker IS bill-splitting now — ONE unified flow

This is the most important scope decision. **There are no more split modes.**

- The picker (Talli custom UI) **replaces bill splitting entirely.** There is
  **one** way to split: get a Talli link → people open it → each picks their
  items → pays. That's it.
- **`even` / `custom` / `by_count` are GONE.** The `SPLIT_MODES` enum,
  `splitService`, and the `split_payment` multi-mode logic are **removed/absorbed
  into the picker.** No "choose a mode" step anywhere.
- Any "split this bill" request — typed or photo — resolves to **the picker**.
  (A photo gives us the line items directly; a typed request with no photo will
  prompt for the bill — see open items.)
- The **payment-confirmation receipt PNG stays exactly as is.** "Receipt infra"
  in your message meant *bill splitting*, not the rendered proof-of-payment image.
  Telegram still gets its PNG receipt on payment.

### Source-aware delivery (NEW requirement)

A bill split can be **initiated from two places**, and the payment
receipt/notification must go back to wherever it started:

| Initiated from | On payment, deliver to |
|---|---|
| **Telegram** (photo sent in a chat) | the **Telegram chat** (`linkedChatId`) — the PNG receipt, as today |
| **Web** (Talli UI, no chat) | the **workspace owner's notification inbox** (`enqueueNotification`) **+ the workspace email** (`mailService.send`) |

So the picker must record its **source**. Today it only stores `linkedChatId`
(Telegram-only). We add a `source` field (`telegram` | `web`); `linkedChatId` is
set only for `telegram`. The settle path branches on `source` to pick the
delivery channel. Both infra pieces already exist:
[`lib/notification-queue.ts`](../services/engine/src/lib/notification-queue.ts)
(`enqueueNotification`) and
[`services/mail.service.ts`](../services/engine/src/services/mail.service.ts)
(`mailService.send`).

### Payment UX: flash account is the hero, NOT a redirect

The old flow returned a `checkoutLink` and the plan was to redirect to Nomba. **We
change that.** The web page becomes the payment surface:

- After a payer commits (items + name), the backend mints their flash account (via
  `paymentService.create`, per selection) and returns
  `{ flashAccountNumber, flashBankName, checkoutUrl, amount, selectionId }`.
- The page shows the **flash account number as the dominant UI**:

  ```
  ┌───────────────────────────────────┐
  │  Transfer ₦4,000 to                │   ← HERO
  │                                     │
  │     9999000011   [copy]            │
  │     Nombank MFB                     │
  │                                     │
  │  ── or ──                          │
  │  Select another payment method  →   │   ← secondary, opens checkoutUrl (Nomba)
  └───────────────────────────────────┘
  ```

- **Bank transfer to the flash account is the primary path**; "Select another
  payment method" (Nomba checkout) is the secondary fallback.
- When that transfer lands (reconcile cron → websocket), the page uses
  **motion/react** to transition into a **complete state**: a polished "✅ Paid"
  screen with a **"Generate receipt"** action (reuses the existing receipt PNG
  renderer, surfaced on the page; the receipt is *also* delivered via the
  source-aware channel above).

This is the same money loop we already have — we're just changing the *surface*
from "redirect to Nomba" to "show the flash account and watch it settle live."

### "Who's paying?" — capturing the payer name

The receipt and the "✅ Paid by <name>" state need a payer name. We collect it
with minimal friction, prefilling from context where we can:

- **Telegram (at split time):** when the split is created, the bot **optionally**
  asks "Who's paying for this? Send their names — or just say *proceed*." Names
  given become a **known-names pool** on the bill split. If they say proceed, the
  pool is empty.
- **Web picker (at pay time):** after a payer picks items, we ask **"Who's
  paying?"** as a **chooser over the known-names pool**. If their name isn't
  there, they **type it**, which **adds to** the pool. The chosen name is attached
  to the selection (and is what shows as "✅ Paid by Ada").
- So the name is **required before checkout** (we mint the flash account for a
  named selection), either picked from the pool or typed fresh.

### What this means for the existing code

- ✅ Keep the **cart checkout** (his `/checkout` already takes an array of
  selections and computes one total — exactly right).
- 🔀 **Change the checkout response** to return the **flash account details**
  (`flashAccountNumber`, `flashBankName`) alongside `checkoutUrl` — not a
  redirect. (`paymentService.create` already returns these.)
- ➕ **Add a known-names pool** to the bill split (populated optionally from
  Telegram at creation, extended from the web at pay time).
- ➕ **"Who's paying?" step** before checkout; name is stored on the selection.
- ➖ **Drop the quantity machinery** (`quantity`, `maxQuantity`, the `Math.max(…,
  99)` bug). Each `PersonPickerItem` becomes claim-once.
- ➕ **Add per-item claimed/paid state** (`status` + `paidBySelectionId` /
  `paidByName`) so the cart can exclude claimed items and the UI can grey them.
- ➕ **Connect reconcile → items**: on settle, mark that selection's items
  claimed, broadcast via websocket, send a picker-aware receipt.

---

## 2. What your partner actually built (backend)

### The data model — [`person-picker.prisma`](../services/engine/src/prisma/schema/person-picker.prisma)

Three new tables, layered **on top of** the existing collection/payment system
(good instinct — it reuses the money loop):

- **`PersonPicker`** — one per receipt-split. Has a public `token` (the link), a
  `title`, `subtotal`/`total`, an `expiresAt`, and is **backed 1:1 by a
  `Collection`** (`collectionId @unique`, type `named_members`).
- **`PersonPickerItem`** — the line items from the receipt (`label`, `unitPrice`,
  `maxQuantity`, `sortOrder`).
- **`PersonPickerSelection`** — one per payer. Stores `payerName`, the chosen
  items (`selections` JSON), the computed `amount`, the `checkoutLink`, the
  `pendingPaymentId`, and links 1:1 to a `CollectionMember`.

So a picker **is** a collection; each payer **is** a collection member; each
payment rides the **existing** collection-payment reconcile loop. Smart reuse.

### The flow he wired

```
1. CHAT: user sends a receipt photo (caption like "everyone pick their items")
     → bill-parser (vision) extracts line items + quantities
     → dispatcher detects person_picker intent (handleBillPhoto, PICKER_CAPTION regex)
     → confirm card → on confirm: runPersonPicker()
2. CREATE: personPickerService.createFromItems()
     → creates a named_members Collection
     → creates PersonPicker + PersonPickerItems
     → returns a link:  <WEB>/picker/<token>
     → bot replies with the link + an "Open" button
3. WEB (public): GET /person-pickers/by-token/:token  → items to render
4. CHECKOUT (public): POST /person-pickers/by-token/:token/checkout
     { payerName, selections:[{itemId, quantity}] }
     → computes amount server-side (trusts item prices, not the client)
     → adds a CollectionMember (expectedAmount = amount)
     → paymentService.create() → Nomba flash-account checkout link
     → saves a PersonPickerSelection
     → returns { amount, checkoutLink, selectionId }
5. PAY: payer opens checkoutLink, transfers → reconcile cron settles it
     → collection member credited (existing loop)
```

### API surface — [`person-picker.route.ts`](../services/engine/src/routes/person-picker.route.ts)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/person-pickers/by-token/:token` | public | items for the web page |
| POST | `/person-pickers/by-token/:token/checkout` | public + rate-limited | create a selection → checkout link |
| GET | `/person-pickers` | authed | owner lists their pickers |
| GET | `/person-pickers/:id/progress` | authed | owner sees who paid |

---

## 3. The target flow you described (the goal)

Mapping your description to concrete steps, so we're aligned:

```
1. ✅ User gets a Talli link (a "selective" split mode).         [BUILT]
2. ⚠️ Link opens a Talli UI showing all the receipt items.       [BACKEND ✅ / NO UI YET]
      → needs: the picker web page (frontend-design)
      → PREREQUISITE: OTP login flow working + protected routes
        (TanStack Router, scribe-style) — BUT the picker page itself
        is PUBLIC (token-based, no login).
2b.⚠️ Payer ticks the item(s) they had (a CART) + enters their name.
      Live total updates. Claimed items are shown disabled.       [BACKEND mostly ✅ / NO UI]
3. ✅ Tapping "Pay" → backend bundles the selected items into ONE
      selection and generates ONE checkout link.                 [BUILT: /checkout]
4. ✅ User pays once for the whole cart.                          [BUILT]
5. ⚠️ Reconcile job marks it paid AND marks the ITEM paid on the
      receipt, AND sends a Telegram receipt to where the split
      was initiated.                                             [PARTIAL — see gaps]
6. ❌ On payment, push a WEBSOCKET to the picker page.            [NOT BUILT]
7. ❌ The paid item is disabled on the UI and flips to
      "X has paid for this item".                                [NOT BUILT — needs #6 + UI]
8. ❌ After payment completes, redirect back to the Talli link.   [NOT BUILT]
```

---

## 4. The gaps — what's missing or wrong

### A. Reconcile → picker is **not connected** (the core "not quite right")

[`payment.service.ts`](../services/engine/src/services/payment.service.ts) has
**zero knowledge of pickers or selections**. When a picker payment settles it:
- ✅ credits the `CollectionMember` (existing loop)
- ✅ writes a `Payment` row + credits the owner wallet (our earlier fix)
- ❌ does **not** mark the `PersonPickerSelection` / its items as paid
- ❌ does **not** push a websocket to the picker page
- ❌ sends the **generic collection** receipt, not a picker-aware "X paid for
  these items" receipt to the originating chat

So step 5 is half-done and steps 6–8 are absent. The settle path needs a
picker-aware branch (or a hook) that, after crediting, finds the selection by
`pendingPaymentId`, marks it + its items claimed, emits the websocket event, and
delivers the receipt **based on the picker's `source`** (Telegram chat vs
inbox+email — see §1b "Source-aware delivery").

### B. Websocket foundation exists but **can't serve the picker page**

[`socket/server.ts`](../services/engine/src/socket/server.ts) is Socket.IO,
already attached to the HTTP server. But:
- It **requires auth** (`authMiddleware`) and only joins `user:${userId}` rooms.
- The picker page is **public/anonymous** (token, no login) — there's **no room**
  it can join and no way for an unauthenticated browser to subscribe.

Needs: a **public room per picker token** (e.g. `picker:${token}`) that the
unauthenticated page can join, and the settle path emitting
`selection.paid` into it. The auth middleware must allow this anonymous,
token-scoped subscription.

### C. No frontend at all for the picker

There's no `/bill/$token` route in [`apps/web`](../apps/web/src/routes/). Needs
a public page that: fetches items, lets a payer enter a name + pick quantities,
calls `/checkout`, opens the pay link, subscribes to the websocket, flips paid
items live, and redirects back after payment.

### D. Pattern inconsistencies vs the codebase (refactor targets)

Your partner didn't fully follow house conventions. Found:
- **`PersonPickerSelection.selections: Json`** — untyped blob; the rest of the
  codebase prefers explicit columns or typed shapes.
- **`createFromItems` deletes the collection on failure** via raw
  `prisma.collection.delete` instead of reusing a `discard`-style cleanup like
  `splitService` does.
- **`maxQuantity: Math.max(item.quantity ?? 99, 99)`** — this always yields ≥99,
  so per-item max is effectively ignored (likely a bug; probably meant `min`).
- **A `person_picker` intent + `quantity` field** were added to
  [`intent.schema.ts`](../services/engine/src/schemas/intent.schema.ts) and the
  parser prompt — fine, but the `PICKER_CAPTION` regex in the dispatcher is a
  fragile keyword match layered on top of the LLM intent (two sources of truth).
- **`PersonPicker` duplicates `title`/`total`/`currency`/`status`** that already
  live on the backing `Collection` — denormalized state that can drift.
- **No Postman sync discipline** for some endpoints (collection had it; verify).
- Naming: feature is "selective payment" to you but "person_picker" in code —
  pick one name and use it consistently (recommend keeping `person_picker`
  internally since the schema's committed, or rename now before more is built).

### E. Prerequisites you flagged (not picker-specific but blocking the UI)

- **OTP login flow** must be working end-to-end on the web app.
- **Protected routes** the TanStack-Router way (scribe pattern). Good news: the
  web app **already implements the exact scribe pattern** — no new architecture
  needed, just verify it works and extend the allowlist.

  **The scribe pattern (confirmed by reading `~/projects/scribe`):**
  - **Router context holds the `queryClient`, not auth state** —
    `createRouter({ context: { queryClient } })`.
  - **Auth is cookie-based** — axios/fetch with `withCredentials: true`; the
    token is an HTTP-only cookie the backend sets on OTP verify. Nothing in
    localStorage, no manual `Authorization` header.
  - **The guard lives in `__root.tsx` `beforeLoad`**: a `PUBLIC_PATHS` allowlist
    bypasses auth; everything else does `context.queryClient.fetchQuery(["me"])`
    and `throw redirect({ to: "/auth" })` on failure. The return value
    (`{ user }`) becomes route context, read downstream via `useRouteContext()`.
  - **After OTP verify**, call `queryClient.invalidateQueries(["me"])` then
    navigate — this re-runs `beforeLoad` with fresh auth.

  **Talli's web app already matches this** —
  [`__root.tsx`](../apps/web/src/routes/__root.tsx) does `beforeLoad` →
  `fetchQuery(["me"])` → `PUBLIC_PATHS` allowlist (`["/", "/auth", "/pay"]`) →
  `redirect({ to: "/auth" })`; [`_app.tsx`](../apps/web/src/routes/_app.tsx) is
  the authed layout; `lib/auth.ts` + `lib/api-client.ts` exist; there's already a
  public `pay/$reference` checkout route.

  **So for the picker:** the public page goes at `/bill/$token` and we **add
  `/bill` to `PUBLIC_PATHS`** (one line). The owner's picker dashboard goes
  under the **protected `_app` tree** (no allowlist entry → auto-guarded). To
  confirm OTP works: verify the backend sets the cookie on verify and that
  `invalidateQueries(["me"])` runs after verify so the guard sees the new
  session.

---

## 5. The corrected end-to-end flow (what we'll build toward)

```
CHAT (Telegram)                         WEB (Talli link, public)
──────────────                          ────────────────────────
receipt photo + "everyone picks"
  → person_picker confirm card
  → confirm
  → create picker + collection
  → (optional) bot asks "who's paying? names, or say proceed" → known-names pool
  → reply: <WEB>/bill/<token>  ───────►  open page (GET by-token)
                                            render items (claimed ones disabled)
                                            TICK the items I had (cart), live total
                                            "Who's paying?" → pick from pool OR type
                                            ─► POST /checkout {name, [itemIds]}
                                            ◄─ { flashAccountNumber, flashBankName,
                                                 checkoutUrl, amount }
                                            SHOW flash account (hero) + "another
                                              method" (→ Nomba checkoutUrl)
                                            transfer to flash account
        Nomba transfer lands
  reconcile cron settles  ◄───────────────────────────────────┐
  → credit member + Payment + wallet                           │
  → MARK selection paid                                        │
  → MARK its items claimed (status + paidByName)               │
  → emit ws  bill:<token>  "items.claimed"  ───────────────►│ page: motion/react
  → deliver receipt via SOURCE (telegram chat │ inbox+email)   │  transition → "✅ Paid"
                                            complete screen: [Generate receipt]
                                            → stays on /bill/<token>
                                              (live claimed state for all)
```

---

## 6. Work plan (order of operations)

1. **Prereqs (web):** confirm OTP login + protected routes (scribe pattern) work;
   add `/bill` to the public allowlist.
2. **Remove the old split modes.** Delete `SPLIT_MODES`, `splitService`, the
   `split_payment` multi-mode dispatch + confirm cards, and their prompt/parser
   wiring. All "split" intents now resolve to the picker. (Check Telegram UI
   strings + keyboards that referenced the old modes.)
3. **Rebuild as `bill_split`** (rename from `person_picker`) with the agreed
   claim-once model + house style: drop `quantity`/`maxQuantity`, per-item
   `status`/`paidByName`, typed selections, `discard` cleanup, de-dup state vs
   Collection, add the `source` field. Treat the merged code as a **reference
   skeleton**, not something to preserve — we're rebuilding the bill-split infra,
   keeping only what's clean (the collection/payment reuse, the cart checkout).
4. **Connect reconcile → picker:** in the settle path, find the selection by
   `pendingPaymentId`, mark it + its items **claimed**.
5. **Checkout guard:** reject items already claimed (the race case) with a clean
   "someone just grabbed this" error.
6. **Websocket:** public `bill:<token>` room; emit `items.claimed` on settle;
   allow anonymous token-scoped subscribe.
7. **Picker-aware, source-aware receipt:** add a `source` field to the picker
   (`telegram` | `web`). On settle, send "X paid for these items" to the right
   channel — Telegram PNG receipt if `source=telegram`, else workspace
   notification inbox + workspace email if `source=web`.
8. **Checkout returns flash account, not a redirect:** change the response to
   `{ flashAccountNumber, flashBankName, checkoutUrl, amount }`; add the
   "Who's paying?" name step + known-names pool.
9. **Frontend (frontend-design skill):** the `/bill/$token` page — a
   **premium, jaw-dropping** UI (NOT generic): tick items → live total → "who's
   paying?" (pool or type) → pay → **flash-account hero + "another method"** →
   **motion/react** transition to "✅ Paid" complete screen with **Generate
   receipt** → live websocket "claimed" flips for everyone → stays on the board.
   Use `@benrobo/iconary` (Icon renderer + core/duotone-rounded data) — never
   plain/default icons. See §8 for the UI bar.
10. **Postman sync** the bill-split endpoints.

---

## 7. Decisions (resolved)

1. ✅ **Cart, pay once.** A payer ticks multiple items and pays for the whole
   selection in one checkout. (Resolves the old "tap-once vs basket" question →
   basket.)
2. ✅ **Claim-once items, no quantities.** Each receipt line is one claimable
   item; it locks for everyone when a selection is **paid**. No per-unit tracking.
   Drop `quantity`/`maxQuantity`.
3. ✅ **Lock on payment, not selection.** Items stay open until a payment settles;
   the rare race is handled by rejecting the second payer at checkout.
4. ✅ **Redirect after payment** → back to `/bill/<token>` (the live board).

5. ✅ **One unified bill-split.** The picker IS bill splitting — `even`/`custom`/
   `by_count` and `splitService` are **removed**. Only the payment-receipt PNG
   stays.
6. ✅ **Source-aware delivery.** Picker records `source` (`telegram`|`web`); on
   payment, receipt → Telegram chat (telegram) or inbox + workspace email (web).

### Still to confirm

- **Name** — `person_picker` is gone. We're rebuilding bill-splitting from
  scratch, so the new name is **`bill_split`** (intent) / `billSplitService` /
  `BillSplit*` models / `/bill-splits` routes. Confirm this name (or pick another)
  before the rebuild — everything is renamed/rewritten around it.
- **Split with no bill photo?** Since `even`/`custom`/`by_count` are removed, what
  happens if someone says "split this" **without** a receipt photo? Options:
  (a) the bot asks them to **send the bill photo** (picker needs items), or
  (b) we also allow **manually entering items** on the web picker (owner types the
  line items). Likely (a) for the demo; (b) is a nice follow-up. Confirm.

---

## 8. UI quality bar (NOT generic — this must wow)

The picker page is the demo's centrepiece, so it cannot look like a default form.

- **Premium, addictive, jaw-dropping** — motion, polish, delight. Not a plain
  list with checkboxes.
- **Use the project's custom icons** — `@benrobo/iconary` (duotone-rounded for product
  UI; see [`AGENTS.md`](../AGENTS.md) Icons section and `packages/icons`). Never
  ship default/emoji-only iconography where a real icon fits. Add new icons via
  `bun icons:add <slug>` when needed.
- **Live, tactile interactions:** items animate as you tick them, the running
  total counts up, and a paid item flips with a satisfying transition into
  "✅ Paid by Ada" the moment the websocket fires — visible to everyone on the
  page at once (the "wow, it updated live" moment).
- **Build with the frontend-design skill**, matching the design tokens in
  `packages/tailwind-config/globals.css`.

This is a build-time requirement, not a nice-to-have — captured here so it's not
forgotten when we reach step 7.

---

## 9. Bottom line (my understanding)

We're **rebuilding bill-splitting from scratch** as one unified flow — not
patching a "picker." Your partner's merged branch is a useful **reference
skeleton**: it proves out reusing the collection + Nomba payment loop and a cart
checkout, which we keep. Everything else gets rebuilt around the agreed model
(§1b): **one bill-split flow, claim-once cart, no modes, no quantities,
source-aware delivery, premium UI.** What that rebuild must add over the
skeleton: (1) reconcile → mark items claimed + websocket + source-aware receipt,
(2) a public websocket room for the anonymous page, (3) the whole frontend, (4)
removal of the old split modes, and (5) the `bill_split` rename + house-style
cleanup (incl. the `maxQuantity` bug). Plan in §6; one naming confirm in §7.
