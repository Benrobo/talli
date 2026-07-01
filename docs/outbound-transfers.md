# Outbound transfers — record, status, and polling

How Talli sends money out and tracks it to a final state. Webhooks are unreliable
for the hackathon, so we **poll** Nomba for the outcome — the same pattern we
already use for inbound payments.

## The problem

`payout()` debits the wallet and calls Nomba, then reports "sent". But:

- Nomba's `POST /v2/transfers/bank` returning 2xx does **not** mean the money
  landed — `data.status` is often `PENDING_BILLING` or `NEW` (still processing).
- Outbound transfers were never stored anywhere — only the wallet ledger entry.
  No payout history, no receipt source, nothing to poll against.
- A retry generated a fresh `merchantTxRef`, risking **double disbursement** (the
  docs are emphatic: reuse the same ref).

## Nomba's transfer lifecycle

```
POST /v2/transfers/bank  ->  data.status:
  SUCCESS          -> done, money sent
  PENDING_BILLING  -> still processing, poll
  NEW              -> still processing, poll
  (HTTP 201)       -> received, outcome unknown, poll
  REFUND           -> failed; Nomba auto-refunded our account
```

Requery (poll) the outcome:

```
GET /v1/transactions/accounts/single?transactionRef=API-TRANSFER-...
```

## The design

A `Transfer` row is the source of truth; a cron polls the pending ones.

```prisma
model Transfer {
  id            String         @id @default(cuid())
  workspaceId   String
  merchantTxRef String         @unique   // idempotency key — stable across retries
  nombaTxId     String?                  // data.id, used for requery
  amount        Int
  accountNumber String
  accountName   String
  bankCode      String
  bankName      String?
  status        TransferStatus @default(pending)   // pending | sent | failed
  walletRef     String                   // links to the wallet debit entry
  failureReason String?
  pollAttempts  Int            @default(0)
  createdAt     DateTime       @default(now())
  completedAt   DateTime?
}
```

**`payout()`** debits, sends, and records — only `SUCCESS` is final on the spot:

```ts
const ref = `talli_send_${randomToken(8)}`;          // stable merchantTxRef
await walletService.debit(wallet.id, amount, "send", ref);

const res = await nomba.transfers.toBank({ ...dest, amount, merchantTxRef: ref });
const status = mapStatus(res.status);                // SUCCESS -> sent, else pending

await transferService.record({ merchantTxRef: ref, nombaTxId: res.id, status, ... });
// pending transfers are finalized by the cron below
```

**The reconcile cron** (mirrors inbound polling) requeries each pending transfer:

```ts
const fresh = await nomba.transactions.requery(t.merchantTxRef);
if (fresh.status === "SUCCESS")  await markSent(t);
if (fresh.status === "REFUND") {
  await walletService.credit(t.walletId, t.amount, "refund", `${t.walletRef}_refund`);
  await markFailed(t, "refunded by Nomba");          // user gets their money back
}
// else: still pending — try again next tick (cap attempts)
```

## Rules

- **Idempotency:** `merchantTxRef` is unique and reused on every retry of the same
  transfer — never regenerated while pending.
- **Refund:** on `REFUND`, credit the Talli wallet back (idempotent on the ref) and
  notify the user it failed. Nomba refunds our account; we mirror that to the user.
- **Receipts:** the `Transfer` row is the receipt source — destination, amount,
  ref, final status, timestamps.

## Out of scope (for now)

- Transfer-status webhook (polling is primary; a webhook can be layered later).
- Per-transfer fee accounting beyond what Nomba returns.
