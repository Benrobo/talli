# Savings funding — how it works, the `walletId` confusion, and virtual accounts

This replaces the earlier draft. Goal: explain savings funding plainly, clear up the
`walletId` question, and make the case for virtual accounts.

## What "funding a jar" actually means today

There are **two completely separate ways** money gets into a savings jar. They share nothing
except the jar itself. Keeping them straight is most of the confusion.

### Path 1 — Deposit from wallet (money you already have on Talli)

`savingsService.depositFromWallet(...)`. Fully internal, one DB transaction, no bank, no Nomba:

1. Check wallet balance is enough.
2. Debit the wallet (`walletTransaction` type `debit`, reason `savings_deposit`) and lower
   `wallet.balance`.
3. Write a `savingsTransaction` (type `deposit`).
4. `savingsJar.currentAmount += amount`.

This is clean and correct. It moves value **wallet → jar**. Nothing pending, nothing to poll.

### Path 2 — Fund by bank transfer (fresh money from outside)

`paymentService.createSavingsFunding(...)` → later `settleSavingsFunding(...)`. This is the
Nomba flow:

1. `createSavingsFunding` makes a Nomba **flash account** (a throwaway NUBAN tied to one
   order), writes a `PendingPayment` row, and shows the payer the account number.
2. The cron polls Nomba until the transfer lands (or the 30-min window expires).
3. On success, `settleSavingsFunding` runs: mark the pending row `completed`, write a
   `Payment` (`savingsJarId` set), and **credit the jar directly** via
   `savingsService.creditJar(jar.id, amount, payment.id)`.

This moves value **bank → jar directly**. The wallet is never involved.

## The `walletId` confusion — you're right, it's wrong

When `createSavingsFunding` builds the pending row it writes a `walletId`:

```ts
// createSavingsFunding
this.create({ purpose: "topup", amount, walletId: wallet.id, collectionId: jar.id })
```

But look at what settle actually does with it:

```ts
// settleSavingsFunding — the whole function
// ... marks completed, writes Payment, then:
await savingsService.creditJar(jar.id, amount, payment.id)   // credits the JAR
// walletId is never read. the wallet is never credited or debited.
```

**`walletId` is written and then ignored on the savings path.** It's vestigial. It exists
only because savings funding was bolted onto the `purpose: "topup"` branch, and a *real*
wallet top-up (money → wallet balance) genuinely needs `walletId`:

```ts
// settle(), the non-savings topup branch:
if (pending.purpose === "topup" && pending.walletId) {
  if (pending.collectionId) {                        // <- "it's actually a jar" trick
    const funded = await this.settleSavingsFunding(pending, amount)
    if (funded) return
  }
  await walletService.credit(pending.walletId, ...)  // <- only THIS needs walletId
}
```

So the single `topup` branch is doing double duty:
- **plain wallet top-up** → uses `walletId`, ignores `collectionId`
- **jar funding** → uses `collectionId` (as a jar id!), ignores `walletId`

That's why it reads as confusing: one code path, two meanings, and each meaning ignores the
other's field. The jar-funding row carries a `walletId` it never uses, and a `collectionId`
that isn't a collection.

**Verdict:** on the direct bank→jar path, `walletId` should not be there. Drop it. (If we ever
want "top up wallet, then sweep into jar," that's a *different, explicit* two-step flow — not a
silent field on the funding row.)

## Why not use a virtual account for savings? (yes — we should consider it)

Right now savings-by-transfer uses a **flash account**: a throwaway NUBAN created per order,
valid for ~30 minutes, that we **poll** to detect payment. Good news: Nomba also supports
**virtual accounts**, and we already have the SDK for it —
`nomba.virtualAccounts.create / get / expire` (`integrations/nomba/resources/virtual-accounts.ts`).

### Flash account (today) vs virtual account

| | Flash account (current) | Virtual account |
|---|---|---|
| Lifetime | One order, ~30 min | Persistent (can be long-lived / reusable) |
| Detection | **Polling** (cron every few sec, `pollAttempts`, `expiresAt`) | **Webhook** `payment_success` — push, near-instant |
| Payer UX | New number every attempt; must pay before it expires | Can be the *same* number each time |
| Infra cost | Constant polling of every open order | Idle until money lands |

### Why virtual accounts fit savings especially well

Savings is inherently **recurring** — you add to a jar again and again. A flash account is a
bad match for that: every top-up spins up a new number with a 30-minute fuse. A virtual
account lets a jar (or a user) have a **stable "pay-in" NUBAN**: save it once, transfer to it
whenever, money lands and routes to the jar via webhook. No expiry pressure, no polling, and
it feels like a real account — which is exactly the mental model of a savings jar.

Two shapes worth weighing:
- **Per-user virtual account** — one NUBAN per user; the transfer's context (which jar) is
  chosen in-app before/after. Fewer accounts to manage.
- **Per-jar virtual account** — one NUBAN per jar; transferring to it always funds that jar,
  even from outside the app. Strongest UX for a "savings pot," more accounts to provision.

### The catch (why it's not a trivial swap)

- **Requires webhooks to be solid.** Virtual accounts settle by `payment_success` webhook.
  We currently lean on polling precisely because the webhook path isn't the primary. We'd need
  a reliable, idempotent webhook handler (Nomba already has a `webhooks` resource + a
  `/api/webhook/nomba` callback wired into checkout).
- **Reconciliation matching.** With flash accounts, one order = one payment. With a persistent
  virtual account, an inbound transfer must be matched to *which jar / which intent* — usually
  by amount + a reference, or by dedicating an account per jar so the account itself is the
  key.
- **Lifecycle.** Virtual accounts need create/expire management and cleanup when a jar is
  deleted (`nomba.virtualAccounts.expire`).
- **Sandbox limitation.** Per the Nomba notes, sandbox lookups are mocked — end-to-end virtual
  account testing may only be verifiable against live.

### Recommendation on accounts

For **savings specifically, virtual accounts are the better model** and worth adopting — the
recurring nature of jars is the textbook case for a persistent pay-in account, and webhook
settlement is simpler and cheaper than polling. Do it as its own step, gated on a hardened
webhook handler. Collections (one-shot, time-boxed) can stay on flash accounts, or move later.

## Putting it together — what savings funding *should* look like

1. **Two clear inbound methods, named for what they do:**
   - `depositFromWallet` (internal, wallet → jar) — already correct, keep.
   - `fundByTransfer` (bank → jar) — same intent as today's `createSavingsFunding`, but:
     - **no `walletId`** on the funding record (it's never used),
     - the target is a **real `savingsJarId`**, not `collectionId`,
     - settled by **virtual-account webhook** (preferred) or flash-account polling (interim).
2. **Stop overloading the `topup` branch.** Jar funding is its own purpose/flow, not "topup
   with a collectionId that's secretly a jar."
3. **Share the Nomba plumbing, split the meaning.** The order/flash-or-virtual creation and
   the poll/expire (or webhook) machinery are provider concerns that both savings and
   collections use; the *settle side effects* (credit jar vs credit member) belong to each
   domain. (This is the table-split discussion — see git history of this file if needed.)

## Immediate fix already shipped

Deleting an empty jar was broken because the code queried a non-existent `savingsJarId` on
`PendingPayment`. Fixed in `savingsService.remove()` by filtering the disguised fields
correctly:

```ts
await prisma.pendingPayment.deleteMany({ where: { purpose: "topup", collectionId: jarId } })
```

This unblocks jar deletion today; the cleanups above (drop `walletId`, real `savingsJarId`,
virtual accounts) are the follow-ups.
