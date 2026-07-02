# Testing & security review — money flow (post workspace/VA/ledger migration)

Scope: the money paths after the migration — virtual-account savings funding, the
Payment ledger, collections, transfers, and the reconcile cron. Ranked by severity.
Each finding has: what's wrong, how it breaks, and how to test/fix.

> TL;DR of the risky ones: **#1 (VA double-match)** and **#2 (ledger race)** are the two
> that can actually move wrong amounts of money. Read those first.

---

## 🔴 CRITICAL

### 1. One bank transfer can settle MULTIPLE savings/topup intents (double credit)

**Where:** `payment.service.ts › pollVirtualAccount`.

The virtual account is **one per user, persistent**. Every wallet-topup and savings-funding
intent for that user polls the **same** VA and matches a transaction purely by:

```ts
const match = (page.results ?? []).find((tx) => {
  if (String(tx.status).toUpperCase() !== "SUCCESS") return false;
  if (this.toNaira(tx.amount) !== pending.amount) return false;   // amount-only match
  if (!tx.timeCreated) return true;
  return !dayjs(tx.timeCreated).isBefore(pending.createdAt);
});
```

The per-intent idempotency (`referenceId = orderRefId`) only stops the **same** intent from
crediting twice. It does **not** stop **two different intents** from both matching the **same**
bank transaction.

**Failure scenario:** user opens two "Add money" intents of **₦100** (two jars, or a jar +
a wallet top-up), then sends **one** ₦100 transfer. The next cron tick: intent A finds the
₦100 SUCCESS tx → credits jar A. Intent B finds the *same* ₦100 SUCCESS tx → credits jar B.
**One ₦100 transfer became ₦200 of credited savings.** Free money.

**Why the current UX only partly saves us:** the Add-money sheet allows one live intent per
jar at a time and cancels on close — but nothing stops (a) two different jars each with a ₦100
intent, or (b) a jar intent + a wallet top-up of the same amount, or (c) two devices/tabs.

**Fix options (pick one before real money):**
- **Bind the tx to exactly one intent.** When a tx matches, atomically "claim" it: record the
  matched `sessionId`/`transactionId` on the pending row, and add a `@@unique` on
  `PendingPayment.providerReference` (the matched Nomba tx id) so a second intent claiming the
  same tx id fails. Match query must also **exclude tx ids already claimed by any pending/completed row**.
- **Or** attach a per-intent reference to the transfer (if Nomba VA credits expose a narration
  we control) and match on that instead of amount — the exact fix noted in
  `docs/savings-model-design.md`.
- **Interim guard:** forbid more than one open VA intent per user at a time (reject a new
  deposit while any `savings_funding`/`wallet_topup` is `pending`). Crude but closes the hole.

**Test:**
1. Create two ₦100 intents (two jars). Simulate one ₦100 SUCCESS tx in the mock. Run reconcile.
   → EXPECT exactly one jar credited; currently BOTH get credited.
2. One jar ₦100 intent + one wallet top-up ₦100. One ₦100 tx. → EXPECT one credited.

---

### 2. Ledger balance update is read-then-write without a lock (concurrent debit race)

**Where:** `ledger.service.ts › applyEntry`.

```ts
const user = await tx.user.findUnique({ where: { id }, select: { walletBalance: true } });
const balanceAfter = user.walletBalance + delta;
if (balanceAfter < 0) throw new BadRequestException("Insufficient balance");
// ... create Payment ... then:
await tx.user.update({ where: { id }, data: { walletBalance: balanceAfter } });
```

This runs in a transaction, but Postgres' default isolation (READ COMMITTED) does **not**
lock the `User` row on `findUnique`. Two concurrent debits both read the same starting
balance, both pass the `>= 0` check, and both write — the second overwrites the first.

**Failure scenario:** balance ₦100. Two simultaneous ₦100 transfers (double-tap, or a transfer
+ a save-to-jar firing together). Both read ₦100, both pass, both debit → balance ends at ₦0
but **₦200 left the wallet**. Overdraft / money created.

**Fix:** lock the row or make the update atomic and conditional:
- `SELECT ... FOR UPDATE` on the user row inside the tx (raw query), **or**
- Do a conditional atomic update: `UPDATE users SET walletBalance = walletBalance - :amt WHERE id = :id AND walletBalance >= :amt` and check `rowsAffected === 1` — reject if 0. This removes the read-then-write gap entirely.

**Test:** fire two debits for the full balance concurrently (`Promise.all`). EXPECT exactly one
succeeds, one throws "Insufficient balance". Currently both may succeed.

---

## 🟠 HIGH

### 3. Stale / pre-existing transactions can match a new intent

**Where:** `pollVirtualAccount` date window + time check.

`dateFrom = createdAt (YYYY-MM-DD)` is **day-granular**, and the only recency guard is
`timeCreated >= pending.createdAt`. If a Nomba tx has no `timeCreated`, the code treats it as a
match (`if (!tx.timeCreated) return true`). So a user's **earlier** same-amount transfer that
day (e.g. a previous top-up whose tx is still returned by the list endpoint) can be matched to
a **new** intent of the same amount.

Combined with #1, this is how a single historical transfer could keep "funding" new intents.

**Fix:** require `timeCreated` to exist AND be strictly after `createdAt`; treat a missing
`timeCreated` as **no match** (fail closed, not open). Plus the claim-the-tx-id fix from #1.

**Test:** create a SUCCESS tx dated *before* the intent, same amount, then create the intent and
reconcile. EXPECT no credit.

---

### 4. Expiry only fires while the cron still polls the row — 30-min window depends on it

**Where:** `reconcile` marks `expired` only when `canExpire && now > expiresAt`, and the row is
only visited if `listPollable` returns it (`status pending AND pollAttempts < MAX_POLL_ATTEMPTS`,
MAX = 360 = 30 min at 5s). These now agree (fixed earlier), but note: if the cron is **down**
for a stretch, `pollAttempts` stops incrementing, so a row can outlive its wall-clock `expiresAt`
and still be `pending` when the cron resumes — it will then expire on the next visit, which is
correct. Just be aware "expired" is lazy (only on poll), not a timer.

**Edge case to test:** stop the cron, let `expiresAt` pass, restart. EXPECT the row expires on
the next tick (not silently settles a late transfer as if fresh — though a genuine late
transfer *should* still settle; confirm which behavior you want for VA-funded jars).

---

## 🟡 MEDIUM

### 5. Amount mismatch = silently never settles (money stuck)

`pollVirtualAccount` requires `toNaira(tx.amount) === pending.amount` **exactly**. If the payer
transfers **more or less** than the intent amount (very common — they round, or send ₦1000 for
a ₦950 intent), it **never matches**, the intent expires, and their money sat on the VA with no
jar credit and no UI feedback beyond "expired".

**Decide the policy:** (a) credit the actual received amount even if it differs, or (b) refund,
or (c) at least surface "we received ₦X but expected ₦Y." Right now it's silent.

**Test:** intent ₦950, tx ₦1000. EXPECT a defined behavior; currently nothing happens.

### 6. `verifyDeposit` / `cancelDeposit` ownership check is implicit

`cancelSavingsFunding` and `reconcileSavingsOnce` scope by `savingsJarId === jarId`, but the
controller takes `jarId` from the URL and the pendingPaymentId from the body **without checking
the jar belongs to the authenticated user**. A user could pass someone else's `jarId` +
`pendingPaymentId`. Deletion is guarded (must match jar + status pending), and verify only
reconciles — but confirm the jar is owned by `ctx.userId` in the controller to be safe
(defense in depth). Low blast radius today, but it's an IDOR-shaped gap.

**Test:** as user A, call `/savings/<B's jarId>/deposits/verify` with B's pendingPaymentId.
EXPECT 403/404, not a reconcile.

### 7. VA provisioning is best-effort — funding can 500 if it never provisioned

Signup provisions the VA best-effort (Nomba failure doesn't block signup). `requireByUser`
lazily retries on first use. But if Nomba is down at *both* signup and first deposit, the
deposit throws. That's acceptable (fails loudly), but the Add-money sheet should show a clean
"couldn't set up your account, try again" rather than a raw error.

**Test:** force `nomba.virtualAccounts.create` to throw; open Add money. EXPECT a friendly error.

### 8. Collection flash-account path is unchanged and still correct

Collections still use per-order flash accounts + `confirmReceipt` (one order = one account =
one tx), so the #1 double-match class does **not** apply there — the flash account is unique per
intent. Good. Just don't "unify" collections onto the shared-VA polling without the #1 fix.

---

## 🟢 LOW / hygiene

- **Debug `console.log` in money paths.** `ledger.service` (balance updated), `transfer.service`
  (payout logs), `savings.controller` (cancel logs), `virtual-account.service` (VA JSON) all
  `console.log`. Fine for the hackathon; strip or route through `logger` before production, and
  make sure the VA JSON log doesn't leak account data into shared logs.
- **`reconcileOnce` (collection verify) has no per-user auth check** — it's called from the
  public pay page by reference, which is intended, but it will reconcile any pending id that
  matches the collection reference. Confirm that's acceptable (it only advances state, doesn't
  move money to the caller).
- **No rate limit on the reconcile cost.** `listPollable` caps at 50/tick every 5s; with many
  open intents, Nomba API calls could pile up. Fine at current scale; watch it.
- **`AuditLog` lost owner scoping** (now only `actorUserId`) — non-issue for money, noted for
  audit views.

---

## Suggested test matrix (manual, against a running engine)

| # | Scenario | Expected | Ties to |
|---|---|---|---|
| 1 | Two ₦X jar intents, one ₦X transfer | one jar credited | #1 |
| 2 | Jar ₦X intent + wallet ₦X top-up, one ₦X transfer | one credited | #1 |
| 3 | Two concurrent full-balance debits | one succeeds, one rejected | #2 |
| 4 | SUCCESS tx dated before intent | no credit | #3 |
| 5 | Intent expires (30 min / cron), reload jar | shows not-funded, no ghost credit | #4 |
| 6 | Transfer wrong amount (over/under) | defined behavior, not silent | #5 |
| 7 | Verify/cancel another user's jar id | 403/404 | #6 |
| 8 | Nomba VA create down at deposit | friendly error in sheet | #7 |
| 9 | Close Add-money sheet on details view | pending intent deleted (no orphan row) | design |
| 10 | Reload jar after real transfer lands | jar balance += amount exactly once | #1/idempotency |
| 11 | Collection pay by two members same amount | each credited to their own member | #8 |
| 12 | Transfer fails at Nomba | wallet refunded exactly once | ledger refund |

## What is already solid (verified in review)

- **Per-intent idempotency**: savings settle claims the pending row (`updateMany status in
  [pending,failed,expired]`) AND dedupes the Payment on `orderRefId` — the *same* intent cannot
  double-credit.
- **Ledger dedupe on `referenceId`** (unique) prevents replaying the *same* reference.
- **External jar funding does not touch `walletBalance`** (writes `balanceAfter: null`), so VA
  jar deposits can't corrupt the spendable wallet balance.
- **Collection settle** credits the owner once via a single `ledgerService.credit` (old
  double-write removed).
- **Transfer** debits then refunds on failure, both keyed on the merchant ref.
- **Never-negative** balance check exists (just not concurrency-safe — see #2).
