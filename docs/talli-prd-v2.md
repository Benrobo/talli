# Talli PRD v2 — wallet-first architecture

A rework forced by real Nomba constraints. v1 assumed virtual accounts +
webhooks + payouts. None of that is dependable right now, so v2 moves to an
**internal wallet** funded by **flash-account top-ups** and reconciled by
**polling**, not webhooks.

**Date:** 2026-06-28 · supersedes the payment/flow parts of `talli-prd.md`.
The product (collect / save / send in chat, AI parses & confirms) is unchanged;
**how money moves** is what changes.

---

## 1. Why v2 — the Nomba constraints

| Capability v1 relied on | Reality | v2 response |
|---|---|---|
| **Virtual accounts** (per collection/jar/user) | Capped at **2** in test; **disabled** in live | Drop them. Use **one internal wallet ledger per user** + flash accounts for inbound. |
| **Webhooks** (authoritative payment status) | Need server IP whitelisting to be reliable; not guaranteed | Drop the webhook dependency. **Poll** transaction status on a schedule. |
| **Payouts / transfers** (`/transfers/bank`) | Don't work in prod without Nomba IP-whitelisting our server | Keep Send Mode in scope, but **blocked on whitelisting**; ledger is designed so it slots in. |
| Sandbox for everything | Flash account / real money needs live | **Default to live** (`NOMBA_ENV=live`) for the money paths. |

The one Nomba primitive that *does* work for inbound money: **checkout flash
account numbers** — a unique NUBAN per order that a customer transfers into.

---

## 2. The core model: an internal wallet

Every user gets a **wallet** at signup — a balance tracked in Talli's DB as a
ledger of transactions, **not** a Nomba account. Nomba is only the rail for money
*entering* (top-ups, collection payments). Balances, deductions, and history live
in Talli.

```
signup                → wallet created (balance 0, no account number yet)
top up                → flash account number issued → user transfers from their bank
                        → cron polls → detected → wallet credited (ledger entry)
collect / save        → debit the wallet ledger (no external call)
send (later)          → debit wallet + Nomba transfer (blocked on IP whitelisting)
balance low           → email to top up
```

The wallet is the single source of truth for "how much does this user have".

---

## 3. Top-up flow (the heart of v2)

Funding the wallet, using the flash account number + polling. **One order per
top-up.**

```
1. user taps "Top up ₦X"
2. create a Nomba checkout order  (POST /v1/checkout/order) → orderReference
3. fetch its flash account number (GET /v1/checkout/get-checkout-kta/{orderReference})
     → { accountNumber, accountName, bankName }
4. show it: "Transfer ₦X to <accountNumber> (<bankName>)"
5. record a queued top-up (status: pending) keyed by orderReference
6. a cron polls each pending top-up:
     POST /v1/checkout/confirm-transaction-receipt { orderReference }  (or
     GET /v1/transactions/accounts/single?orderReference=) → status
7. on success → idempotently credit the wallet (a `wallet_transactions` row) +
   mark the top-up completed → notify the user
```

Notes:
- Flash accounts appear to be **per order**, so each top-up makes its own order.
- The poll is the reconciliation, not a webhook. Dedup on `orderReference` so a
  top-up credits exactly once.
- Amount check: credit the *actual* amount received from the transaction, not the
  requested amount (users may transfer more/less).

### The polling cron

A scheduled job (Talli already has `cron/scheduler.ts`) runs every ~1 min:
- load `top_ups` where `status = pending` and not expired
- for each, fetch transaction details from Nomba
- success → credit wallet + complete; still pending → leave; expired → mark expired
- back off / cap attempts so a stuck order doesn't poll forever

---

## 4. Collections — members pay via flash account (no wallet needed)

Group members may never sign up, so they **don't** need a wallet. A member paying
a collection uses the **same flash-account + polling** mechanic as a top-up, but
the credit goes to the **collection member**, not a wallet.

```
member taps "Pay ₦3,000"
  → create checkout order for that member  → orderReference + flash account number
  → show "Transfer ₦3,000 to <accountNumber>"
  → cron polls → on success → credit the collection_member (paid) + announce
```

So: **only the creator/owner needs a wallet**; collection payers just transfer to
a one-off flash account. Same poller handles both (a queued payment row carries
either a `walletId` for top-ups or a `collectionMemberId` for collection pays).

---

## 5. Savings — deduct from the wallet

Savings jars are personal, so the owner has a wallet. **Funding a jar debits the
wallet** (no external payment) — instant, no flash account. If the wallet is
short, prompt a top-up first.

```
"save ₦2,000 to rent"
  → wallet balance >= 2,000 ?
        yes → debit wallet (ledger) + credit jar (atomic)
        no  → "Top up first" → top-up flow → retry
```

Withdrawing from a jar (back to wallet) is a ledger move; jar→bank is a Send (§6).

---

## 6. Send Mode — in scope, blocked on whitelisting

P2P-to-bank, collection payouts, jar withdrawals. Mechanically: **debit the
wallet ledger** + call Nomba `/transfers/bank`. The ledger half works today; the
Nomba transfer half **fails in prod until our server IP is whitelisted with
Nomba**. So:

- Build the wallet-debit + beneficiary-resolve + confirm flow now.
- Gate the actual `nomba.transfers.toBank` call behind a feature check; surface a
  clear "payouts are being enabled" message until whitelisting lands.
- DM-only, parse-and-confirm (unchanged from v1).

---

## 6b. The balance invariant (most important rule in v2)

**The ledger (`wallet_transactions`) is the source of truth. `wallets.balance` is
a cache** of `SUM(credits) − SUM(debits)`, kept correct by one rule:

> Every balance change writes the ledger row **and** updates `wallets.balance`
> inside the **same DB transaction**. Never one without the other.

```ts
async function applyEntry(walletId, { type, amount, reason, referenceId }) {
  return prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUniqueOrThrow({ where: { id: walletId } });
    const delta = type === "credit" ? amount : -amount;
    const balanceAfter = w.balance + delta;
    if (balanceAfter < 0) throw new BadRequestException("Insufficient balance");

    await tx.walletTransaction.create({
      data: { walletId, type, amount, reason, referenceId, balanceAfter },
    });
    return tx.wallet.update({ where: { id: walletId }, data: { balance: balanceAfter } });
  });
}
```

- **Idempotency:** `referenceId @unique` — a re-polled top-up or retried debit
  can't double-apply (the duplicate insert throws, the whole tx rolls back).
- **No negative balance:** the guard is inside the tx, so concurrent debits can't
  both pass (row is locked by the update).
- **`balanceAfter`** on each row gives a per-transaction running balance and a way
  to audit/rebuild.
- **Reconciliation job (safety net):** a periodic check that
  `wallet.balance == SUM(ledger)`; log/alert on any drift. Drift should be
  impossible given the rule, but the check catches bugs early. Never silently
  "fix" balance from the cache — always trust the ledger.

Every money path (top-up credit, savings debit, collection, send, refund) goes
through this one `applyEntry`. Nothing touches `wallets.balance` directly.

---

## 7. Data model changes

New tables (one domain per file, per conventions):

```prisma
/// One internal wallet per user. `balance` is a CACHE of the wallet_transactions
/// ledger (the source of truth), updated atomically with each ledger row — see
/// §6b. NOT a Nomba account; Nomba only funds it.
model Wallet {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance       Int      @default(0)   // cached SUM(credits) - SUM(debits), in naira
  currency      String   @default("NGN")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  transactions  WalletTransaction[]
  @@map("wallets")
}

/// The ledger. Every credit (top-up) / debit (save, collect-from-self, send)
/// is a row; the wallet balance is their sum. Idempotent on referenceId.
model WalletTransaction {
  id          String   @id @default(cuid())
  walletId    String
  wallet      Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)
  type        String   // credit | debit
  amount      Int
  reason      String   // topup | savings_deposit | collection | send | refund
  referenceId String?  @unique  // orderReference / jarTxn / etc — dedupe key
  balanceAfter Int
  createdAt   DateTime @default(now())
  @@index([walletId])
  @@map("wallet_transactions")
}

/// A queued inbound payment awaiting a bank transfer, reconciled by polling.
/// Serves BOTH wallet top-ups (walletId set) and collection payments
/// (collectionMemberId set). The flash account number is shown to the payer.
model PendingPayment {
  id                 String   @id @default(cuid())
  orderReference     String   @unique
  purpose            String   // topup | collection
  walletId           String?
  collectionId       String?
  collectionMemberId String?
  payerPlatformUserId String?
  amount             Int
  flashAccountNumber String?
  flashBankName      String?
  status             String   @default("pending") // pending | completed | expired | failed
  pollAttempts       Int      @default(0)
  expiresAt          DateTime?
  completedAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  @@index([status])
  @@map("pending_payments")
}
```

Reuse where possible: the existing `payments` table can be retired or repurposed
into `pending_payments`; `collection_members.paidAmount/status` still track
collection progress; savings tables unchanged (jar funding becomes a wallet
debit + jar credit).

---

## 8. Nomba SDK additions

The SDK (`integrations/nomba/`) gains the two verified endpoints:

```ts
// resources/checkout.ts
getFlashAccount(orderReference: string): Promise<{ accountNumber, accountName, bankName }>;
//   GET /v1/checkout/get-checkout-kta/{orderReference}

confirmReceipt(orderReference: string): Promise<{ status: boolean; order: {...} }>;
//   POST /v1/checkout/confirm-transaction-receipt   ← the poll
```

`createOrder` already exists. Polling can also use the existing
`transactions.getSingle({ orderReference })`. **Default `NOMBA_ENV=live`** for
these money paths.

---

## 9. What this removes / changes from v1

- **Remove**: virtual-account funding, webhook-as-source-of-truth crediting (the
  `nomba.wh.service` payment_success path), the assumption that payouts work.
- **Change**: `payment.service` becomes top-up/pending-payment oriented; the
  collection pay-tap creates a flash account instead of a hosted checkout link;
  savings funding becomes a wallet debit.
- **Keep**: the whole chat layer (Telegram, linking, NL parser, dispatcher,
  confirm cards), Nomba auth/SDK, collections/savings/beneficiary services
  (rewired to the wallet).
- The webhook route can stay mounted (harmless) but is no longer load-bearing.

---

## 10. Build order (v2)

1. `Wallet` + `WalletTransaction` + `PendingPayment` tables; wallet created on
   signup (extend `auth.service` verifyOtp).
2. SDK: `getFlashAccount` + `confirmReceipt`. Switch default env to live.
3. `wallet.service` (credit/debit ledger, balance, atomic) + `topup.service`
   (create order → flash account → queue pending).
4. Polling cron: reconcile `pending_payments` → credit wallet / collection.
5. Rewire collections (flash account per member-pay) + savings (wallet debit).
6. Send Mode behind the whitelist gate.
7. Postman: top-up, wallet balance, pending-payment status endpoints.

Each step testable against **live** Nomba with a small real transfer.

---

## 11. Open questions / risks

- **Flash account lifecycle** — does the number expire? Confirm against live;
  drives the top-up `expiresAt` and poll cap.
- **Poll cadence vs. rate limits** — Nomba rate limits; tune the cron interval +
  batch size. NIBSS settlement can lag a few minutes.
- **Live testing cost** — every test top-up is real money in/out. Use the
  smallest amounts; keep a runbook.
- **Send unblock** — get Talli's prod server IP whitelisted with Nomba; until
  then Send is built-but-gated.
- **Partial/over payments** — credit actual received amount; handle mismatch vs.
  the requested amount (top-up: credit actual; collection: mark paid if >= expected).
