# Migration: remove workspaces · virtual accounts · one-ledger

Status: **code complete, compiles clean (engine + web).** One manual step left for you
(the DB reset — Prisma blocks AI agents from destroying a database; see the end).

## What changed and why

Three structural problems from the earlier discussion, all fixed:

1. **Workspaces made no sense** for a personal money chat app ("send 20k to my NamedJar" was
   ambiguous across workspaces). → Removed entirely. Everything is now scoped to `userId`.
2. **Savings funding was confusing** (a jar id stuffed into `collectionId`, a `walletId` that
   was written but never used). → Savings now funds via a **per-user Nomba virtual account**,
   polled by transaction lookup.
3. **Three overlapping money tables** (`Payment`, `WalletTransaction`, `SavingsTransaction`)
   plus a `Wallet` entity. → Collapsed into **one ledger: the `Payment` table**. Wallet
   balance is a cached number on `User`, written only through the ledger.

## Schema (services/engine/src/prisma/schema)

Deleted models: `Workspace`, `WorkspaceMember`, `Wallet`, `WalletTransaction`,
`SavingsTransaction`. Deleted field `User.activeWorkspaceId`.

New / reshaped:
- `User` gains `walletBalance Int @default(0)` (the cached spendable balance) + back-relations.
- `VirtualAccount` (one per user): `{ userId @unique, accountRef, accountNumber, bankName, accountName, provider }`.
- `Payment` is now the **unified append-only ledger**: `userId`, `direction (credit|debit)`,
  `kind (wallet_topup | collection_payment | savings_deposit | savings_withdrawal | transfer_out | refund)`,
  `amount`, `status`, `balanceAfter?`, plus optional targets (`savingsJarId`, `collectionId`,
  `collectionMemberId`, `transferId`, `payerUserId`, `payerPlatformId`) and provider fields.
  `referenceId @unique` is the idempotency key.
- `PendingPayment` re-modeled: `purpose (wallet_topup | savings_funding | collection)`,
  `userId?`, real `savingsJarId?`, `virtualAccountNumber?` (for VA-based topup/savings) +
  `flashAccountNumber?` (kept for collection payments). Dropped `walletId` and the
  `collectionId`-as-jar hack.
- Every other model reparented `workspaceId → userId/ownerUserId` (`Collection.ownerUserId`
  [also absorbed `createdByUserId`], `SavingsJar.ownerUserId`, `Transfer.userId`,
  `Beneficiary.userId` [unique `[userId, alias]`], `BillSplit` keeps `createdByUserId`,
  `LinkedChat.userId`, `ChatLinkCode` keeps `createdByUserId`, `BotCommand.userId`,
  `AuditLog.actorUserId`).

## Money model (how balances work now)

- **Wallet balance** = `User.walletBalance`, a cache. The **only** writer is
  `ledger.service.ts › applyEntry` (credit/debit), which in one transaction: dedupes on
  `referenceId`, computes the new balance, **rejects if it would go negative**, writes the
  `Payment` ledger row (with `balanceAfter`), and updates `User.walletBalance`. This preserves
  the exact invariants the old `wallet.service` had.
- **Jar balance** = `SavingsJar.currentAmount` (cache), also derivable as the sum of the jar's
  `savings_deposit`/`savings_withdrawal` Payment rows.
- **Collection collected** = `CollectionMember.paidAmount` (unchanged).

Money paths:
- **Wallet top-up**: `PendingPayment(purpose=wallet_topup)` on the user's VA → reconcile polls
  the VA → `ledger.credit(userId, wallet_topup)`.
- **Save from wallet** (`depositFromWallet`): `ledger.debit(userId, savings_deposit, {savingsJarId})`
  (moves wallet→jar, one ledger row) + increments `currentAmount`.
- **Fund jar by transfer** (external money): `PendingPayment(purpose=savings_funding)` on the
  user's VA → on settle writes a `savings_deposit` credit row with `balanceAfter: null`
  (**does not touch walletBalance**, because it's new external money going straight to the jar)
  + increments `currentAmount`. Idempotent on the order ref.
- **Collection payment** (external payer): kept the Nomba **flash-account + checkout** flow
  (one-shot external payers). On settle: credit the collection owner once via
  `ledger.credit(collection.ownerUserId, collection_payment)` (deduped) — the old
  double-write (wallet credit + separate Payment insert) is gone.
- **Transfer out**: `ledger.debit(userId, transfer_out)`; on Nomba failure/refund
  `ledger.credit(userId, refund)`.

## Virtual accounts (savings + wallet top-ups)

- Provisioned **on signup** (`auth.service.verifyOtp` → `virtualAccountService.ensureForUser`),
  best-effort and idempotent (a Nomba failure does not block signup; it retries lazily on
  first use via `requireByUser`).
- **One VA per user** (not per jar) — a user with 10 jars still has 1 VA. Funding is routed by
  the `PendingPayment` intent, not by dedicated per-jar accounts.
- Reconciliation is **polling** (hackathon-appropriate, per your Nomba notes):
  `nomba.transactions.listByVirtualAccount({ virtualAccountNumber, dateFrom, dateTo })` →
  match `SUCCESS` + exact amount + time ≥ intent start → `requery(sessionId)` to confirm →
  settle. Webhook can become primary later; polling stays as fallback.

## How the work was done

Schema + core plumbing (ledger.service, virtual-account.service, Nomba VA poll, signup
provisioning) done directly, then **6 parallel sub-agents** on disjoint file sets
(payment; transfer+beneficiary; savings; collection+bill-split; metrics+balance+receipts;
chat+dispatcher+telegram+server) plus **1 agent** for the web frontend. Each agent verified
its own files typecheck; I then reviewed the seams (idempotency, no double-credit, dispatcher
wiring) and fixed the cross-agent gaps (the Telegram `pay.handler`, the wallet-metrics DTO).

## Verification

- **Engine `tsc --noEmit`: 0 errors** (down from 10 pre-existing — I also fixed 4 latent ones:
  nomba transactions query typing, pipeline-logger cast, ai/models private-member leak).
- **Web `tsc --noEmit`: 0**, **`vite build`: success**.
- Zero residual references to `workspaceId` / `walletService` / `prisma.wallet` /
  `prisma.workspace` / `walletTransaction` / `savingsTransaction` / `ensureWallet` in engine
  source.
- Frontend has zero `workspace` references (switcher + scoping removed; query keys de-scoped).

## ⚠️ ONE MANUAL STEP — you must run the DB reset

Prisma refuses destructive DB operations when invoked by an AI agent (a safety guard). Per
your instruction ("run migrate reset if it needs user input, skip it, I'll run it myself"), I
stopped there. The old migration files are already deleted and the schema validates.

Target DB is your **local dev** DB (`localhost:5433/talli`) — safe to wipe.

Run this to recreate the database from the new schema and generate a fresh init migration:

```bash
cd services/engine
GITHUB_TOKEN=$(gh auth token) npx prisma migrate reset --force --skip-seed   # wipes DB + old history
GITHUB_TOKEN=$(gh auth token) npx prisma migrate dev --name init             # creates + applies the new init migration
```

(If `migrate reset` complains there are no migrations, run `migrate dev --name init` alone —
with an empty migrations dir against a drifted DB it will offer to reset; confirm it.)

After that: `bun run` the engine and it should boot against the new schema.

## Open questions / follow-ups (your call, non-blocking)

1. **VA credit matching in production.** Polling matches by `virtual_account + exact amount +
   time`. If two funding intents for the same user have the **same amount** within the poll
   window, matching could be ambiguous. For the hackathon this is fine; before production,
   confirm whether Nomba VA credits expose a per-transfer reference we can attach to the intent
   (would make matching exact). Noted in `docs/savings-model-design.md`.
2. **Sandbox VA testing.** Per your Nomba notes, sandbox transaction lookups are mocked — the
   VA funding flow may only be fully verifiable against live. Worth a manual live smoke test of
   one jar top-up.
3. **Business/team accounts.** We deleted workspaces entirely. If team accounts ever come back,
   add an explicit `orgId` layer then (don't resurrect workspaces). The `userId` reparent
   leaves room for it.
4. **`AuditLog`** lost its owner scoping (now only `actorUserId`). Fine for a personal app; note
   it if you build an admin audit view.
5. **Existing one-off scripts** under `services/engine/src/scripts/` (e.g. reset-data,
   preserve-money-data) still reference the old models and were **left untouched** (they're not
   compiled into the app). Delete or rewrite them when convenient.
6. **Wallet top-up UI copy**: the frontend `TopUpData` type still uses `flashAccount*` field
   names though top-ups now use the VA; the controller returns the VA values under those keys
   for compatibility. Rename to `virtualAccount*` on the frontend when you touch that screen.
