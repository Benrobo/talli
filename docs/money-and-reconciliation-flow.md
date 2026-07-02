# How money moves in Talli — the full flow, in plain English

A study guide. It explains **where money lives**, **how it comes in and goes out**, and
**how the background jobs (crons) finish payments**. Read top to bottom.

---

## 1. The three places money is tracked

Think of the app as tracking money in three "buckets", all now keyed to **one user**
(workspaces are gone):

1. **Wallet balance** — spendable money the user holds inside Talli. Stored as a single
   number: `User.walletBalance`. This is a *cache* — the real history is the ledger (below).
2. **Savings jars** — labelled pots. Each jar has `SavingsJar.currentAmount`.
3. **Collections** — money gathered from other people. Progress tracked on each
   `CollectionMember.paidAmount`.

And there is **one ledger table that records every movement**: `Payment`. Every credit or
debit — wallet top-up, jar deposit, collection payment, transfer out, refund — is one row in
`Payment`, tagged with a `kind` and a `direction`.

```
Payment (the ledger)
  userId       whose money
  direction    credit | debit
  kind         wallet_topup | collection_payment | savings_deposit
               | savings_withdrawal | transfer_out | refund
  amount       naira (integer)
  balanceAfter the wallet balance right after this row (only for wallet-affecting rows)
  referenceId  the idempotency key (unique) — same reference can't be applied twice
  + optional targets: savingsJarId, collectionId, collectionMemberId, transferId
```

**Golden rule:** the wallet balance only ever changes through **one function** —
`ledgerService.applyEntry`. Nothing else writes `User.walletBalance`. That single door is
where we enforce "never go negative" and "never apply the same reference twice".

```ts
// ledger.service.ts (simplified)
async applyEntry(input) {
  if (input.referenceId) {
    const seen = await prisma.payment.findUnique({ where: { referenceId: input.referenceId } });
    if (seen) return { payment: seen, duplicate: true };     // idempotent: already done
  }
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId } });
    const delta = input.direction === "credit" ? input.amount : -input.amount;
    const balanceAfter = user.walletBalance + delta;
    if (balanceAfter < 0) throw new Error("Insufficient balance");   // never negative
    const payment = await tx.payment.create({ data: { ...input, balanceAfter } });
    await tx.user.update({ where: { id: input.userId }, data: { walletBalance: balanceAfter } });
    return { payment, balance: balanceAfter, duplicate: false };
  });
}
```

---

## 2. The key idea: "pending payment" = an in-flight transfer we're waiting on

Talli does **not** use webhooks as the primary mechanism. Instead, when we expect money to
arrive by bank transfer, we write a **`PendingPayment`** row — a little "we're waiting for
₦X" note — and a background job keeps checking the bank until the money lands, then "settles"
it (moves it into the right bucket).

```
PendingPayment (an in-flight transfer)
  purpose      wallet_topup | savings_funding | collection
  amount       what we're waiting for
  status       pending -> completed | expired | failed | cancelled
  userId       who it's for (topup/savings)
  savingsJarId which jar (savings)
  collectionId + collectionMemberId  (collection)
  virtualAccountNumber   the account the payer transfers to (topup/savings)
  flashAccountNumber     the account the payer transfers to (collection)
  expiresAt    when we give up (30 min)
  pollAttempts how many times the cron has checked
```

There are **two ways** a payer transfers, depending on purpose:

- **Virtual Account (VA)** — used for the user's own money: **wallet top-ups** and
  **savings funding**. Each user has ONE persistent VA (a real bank account number). Created
  on signup. The user transfers to their VA, and we poll Nomba's VA transaction list to see it.
- **Flash account** — used for **collections** (external people paying you). Each collection
  payment gets its own throwaway account number tied to one order. We poll that one order.

Why the split? Collections are paid by *outsiders*, one-shot — a per-order flash account is
clean. Savings/top-ups are the *user's own* recurring money — a stable VA feels like a real
account and avoids spinning up a new number every time.

---

## 3. Money coming IN — three flows

### 3a. Wallet top-up (user adds spendable money)

```
User taps "Top up ₦X"
  -> paymentService.createTopUp(userId, amount)
       creates PendingPayment(purpose=wallet_topup, virtualAccountNumber=user's VA)
  -> UI shows the VA account number
User transfers ₦X to their VA from any bank
  -> [cron] every 5s: reconcile checks the VA -> sees the ₦X SUCCESS
  -> settle(): ledgerService.credit(userId, "wallet_topup", amount)   // balance += X
```

### 3b. Savings funding (user funds a jar by transfer) — the new flow

```
User taps "Add money" on a jar -> enters ₦X
  -> POST /savings/:id/deposits
     paymentService.createSavingsFunding(userId, jarId, amount)
       creates PendingPayment(purpose=savings_funding, savingsJarId, virtualAccountNumber)
  -> the bottom sheet slides to "transfer exactly ₦X to <VA>"
User transfers ₦X to their VA
  -> [cron] reconcile -> pollVirtualAccount finds the ₦X SUCCESS -> settle()
  -> settleSavingsFunding(): writes a Payment(kind=savings_deposit, balanceAfter=null)
     AND SavingsJar.currentAmount += X
```

Important: savings funding is **new external money going straight into the jar** — it does
**NOT** touch the wallet balance. That's why the Payment row has `balanceAfter: null` and we
do **not** call `ledgerService` here (that function always moves the wallet). We just write the
ledger record + bump the jar.

```ts
// settleSavingsFunding (simplified) — external money -> jar, wallet untouched
const claim = await prisma.pendingPayment.updateMany({
  where: { id: pending.id, status: { in: ["pending","failed","expired"] } },
  data: { status: "completed" },
});
if (claim.count === 0) return;                        // someone already settled it
const existing = await prisma.payment.findFirst({     // idempotent on the order ref
  where: { OR: [{ referenceId: pending.orderRefId }, { providerOrderId: pending.orderRefId }] },
});
if (existing) return;
await prisma.$transaction(async (tx) => {
  await tx.payment.create({ data: { kind: "savings_deposit", savingsJarId, balanceAfter: null, referenceId: pending.orderRefId, ... } });
  await tx.savingsJar.update({ where: { id: jar.id }, data: { currentAmount: { increment: amount } } });
});
```

### 3c. Save from wallet (move money you already hold into a jar) — instant, no transfer

```
depositFromWallet(userId, jarId, amount)
  -> ledgerService.debit(userId, "savings_deposit", amount, { savingsJarId })  // wallet -= X (one ledger row)
  -> SavingsJar.currentAmount += X
```

Here the money **does** leave the wallet (it's the user's existing balance moving into the
jar), so we use `ledgerService.debit` — one Payment row, wallet lowered, never-negative
enforced.

### 3d. Collection payment (someone pays your collection)

```
Payer opens the pay link -> taps their name / enters amount
  -> paymentService.createCollectionCheckout({ collectionId, collectionMemberId, amount })
       creates a Nomba order + flash account, PendingPayment(purpose=collection, flashAccountNumber)
  -> payer transfers to the flash account
  -> [cron] reconcile -> pollFlash (confirmReceipt) sees it -> settle()
  -> collection branch:
       1. claim the pending row + creditMember (paidAmount += X, in one tx)
       2. recordCollectionPayment: ledgerService.credit(collection.ownerUserId, "collection_payment", amount)
          -> the collection OWNER's wallet goes up by X (they received money)
       3. bill-split settle (if it's a split) / announce in the group chat
       4. email the payer a receipt
```

---

## 4. Money going OUT — transfers

```
transferService.payout({ userId, amount, accountNumber, bankName, ... })
  1. verify the destination against Nomba (real account name)
  2. ledgerService.debit(userId, "transfer_out", amount, { referenceId: merchantTxRef })  // wallet -= X
  3. call Nomba to send to the bank
  4a. Nomba says SUCCESS now      -> Transfer.status = sent
  4b. Nomba throws / says fail    -> ledgerService.credit(userId, "refund", amount, { referenceId: merchantTxRef+"_refund" })  // give it back
  4c. anything else (pending)     -> Transfer.status = pending, the transfer cron finishes it later
```

So a transfer debits the wallet up front, and **refunds** it if the send fails. Both the debit
and the refund are keyed on the merchant reference, so a retry can't double-debit or
double-refund.

---

## 5. The background jobs (crons) — how in-flight money gets finished

The scheduler (`cron/scheduler.ts`) runs three timers in-process:

```ts
cron.schedule("*/5 * * * * *",  reconcilePayments);   // inbound, every 5 seconds
cron.schedule("*/10 * * * * *", reconcileTransfers);  // outbound, every 10 seconds
cron.schedule("*/10 * * * * *", processNotifications);// queued messages
```

Each is wrapped in try/catch so one failure can't crash the app.

### 5a. reconcilePayments (inbound) — the heartbeat of "money coming in"

```ts
// cron/reconcile-payments.ts
const pending = await paymentService.listPollable();   // status pending, pollAttempts < 360
for (const item of pending) {
  await paymentService.reconcile(item.id);             // check + settle if landed
}
```

`listPollable` returns every pending inbound row that hasn't exhausted its attempts.
`MAX_POLL_ATTEMPTS = 360` and the cron runs every 5s → **30 minutes** of polling, which matches
`expiresAt = now + 30min`. After that, the row is abandoned/expired (see below).

### 5b. reconcile(one row) — the decision tree

```ts
async reconcile(pendingId) {
  const pending = await prisma.pendingPayment.findUnique({ where: { id: pendingId } });
  if (pending.status === "completed" || pending.status === "cancelled") return true;  // nothing to do

  // 1. Too old? give up.
  if (pending.status === "pending" && now > pending.expiresAt) {
    await mark(pending.id, "expired");
    return true;
  }

  // 2. Ask the bank: did the money land?
  const outcome = pending.purpose === "collection"
    ? await pollFlash(pending)            // confirmReceipt(orderRef)
    : await pollVirtualAccount(pending);  // list VA transactions, match amount

  // 3. Count the attempt (so we eventually stop).
  await prisma.pendingPayment.update({ where: { id }, data: { pollAttempts: { increment: 1 } } });

  // 4. If it landed, move the money into the right bucket.
  if (outcome.paid) await settle(pending, outcome.amount, previousStatus);
  return outcome.paid || previousStatus !== "pending";
}
```

### 5c. pollVirtualAccount — how we detect a VA transfer (savings / topup)

```ts
const page = await nomba.transactions.listByVirtualAccount({
  virtualAccountNumber: pending.virtualAccountNumber,
  dateFrom: pending.createdAt (YYYY-MM-DD),
  dateTo:   tomorrow (YYYY-MM-DD),
});
const match = page.results.find((tx) =>
  tx.status === "SUCCESS" &&
  toNaira(tx.amount) === pending.amount &&           // match by amount
  tx.timeCreated >= pending.createdAt                // and recency
);
if (match) {
  await nomba.transactions.requery(match.sessionId); // double-confirm before trusting
  // -> settle
}
```

> ⚠️ This amount-only match is the source of the double-credit risk documented in
> `docs/testing-security-review.md` (finding #1). Study that alongside this — it's the one
> weak point in this flow.

### 5d. pollFlash — how we detect a collection transfer

```ts
const receipt = await nomba.checkout.confirmReceipt(pending.orderRefId);
if (receipt.status === true) { /* landed -> settle */ }
```

Simpler and safer than the VA path, because a flash account belongs to exactly **one** order —
there's no "which intent does this transfer belong to?" ambiguity.

### 5e. reconcileTransfers (outbound) — finishing a "pending" send

```ts
// for each Transfer still "pending":
const fresh = await nomba.transfers.requery(transfer.merchantTxRef);
if (SUCCESS)  -> Transfer.status = sent
if (REFUND)   -> ledgerService.credit(userId, "refund", amount) + status = failed
else          -> pollAttempts++ (still pending)
```

---

## 6. Idempotency — why the same money never counts twice

This is the most important safety property. Three overlapping guards:

1. **Claim the pending row.** Settle does `updateMany({ where: { id, status in [pending,
   failed, expired] }, data: { status: completed } })` and checks `count`. If another cron tick
   already completed it, `count === 0` and we bail. Only **one** settle wins.
2. **Dedupe the ledger by `referenceId`.** `referenceId = orderRefId` is `@unique`. Applying the
   same reference twice returns the existing row (`duplicate: true`) — no second credit.
3. **Check for an existing Payment** by `providerOrderId` before writing a jar-funding row.

So even though the cron re-checks the same row every 5 seconds, a landed payment settles
**exactly once**. (The gap is *across different intents* — see the review doc.)

---

## 7. Lifecycle of one savings deposit (end to end)

```
1. User: "Add money" -> ₦100
2. Backend: PendingPayment{ purpose: savings_funding, amount: 100, savingsJarId, VA, status: pending, expiresAt: +30m }
3. Sheet: "Transfer ₦100 to 8578228675 (Wema Bank)" + polls verify every 5s
4. User transfers ₦100 to the VA
5. Cron (or the sheet's verify) : pollVirtualAccount finds the ₦100 SUCCESS -> requery confirms
6. settle -> settleSavingsFunding:
     - claim pending (status -> completed)
     - Payment{ kind: savings_deposit, amount: 100, balanceAfter: null }
     - SavingsJar.currentAmount += 100
7. Sheet flips to "Money added". Jar detail shows +₦100 in Recent deposits.

If the user closes the sheet before step 4:
  -> cancelSavingsFunding deletes the still-pending row (no orphan data)
If 30 min pass with no transfer:
  -> reconcile marks it expired; the jar is never credited
```

---

## 8. Quick reference — files

| Concern | File |
|---|---|
| The ledger (only wallet-balance writer) | `services/ledger.service.ts` |
| In-flight payments: create / poll / settle | `services/payment.service.ts` |
| Virtual account provisioning | `services/virtual-account.service.ts` |
| Savings jars (create, deposit-from-wallet, credit) | `services/savings.service.ts` |
| Transfers out (debit + refund) | `services/transfer.service.ts` |
| Collections (members, crediting) | `services/collection.service.ts` |
| The scheduler (timers) | `cron/scheduler.ts` |
| Inbound reconcile job | `cron/reconcile-payments.ts` |
| Outbound reconcile job | `cron/reconcile-transfers.ts` |
| Nomba VA transaction lookup | `integrations/nomba/resources/transactions.ts` |
| Nomba flash account / checkout | `integrations/nomba/resources/checkout.ts` |

Pair this with `docs/testing-security-review.md` (the risks) and
`docs/migration-userscope-va-ledger.md` (why the schema looks like this).
