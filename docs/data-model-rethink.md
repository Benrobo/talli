# Data-model rethink: workspaces, savings/VAs, and the wallet

Three structural doubts, all worth taking seriously. This is a discussion doc, not a plan of
record — it lays out what's true today, what each change implies, and a recommended direction.
We're OK clearing existing data, which removes the hardest part (backfills), so these become
mostly schema + code refactors.

---

## 1. Do workspaces make sense here?

**Short answer: no, not as they are. Agreed — drop the multi-workspace model.**

### What exists today

`Workspace` is the tenant boundary. Almost everything hangs off `workspaceId`:
`Collection`, `Payment`, `SavingsJar`, `Beneficiary`, `Transfer`, `BillSplit`, `AuditLog`,
`LinkedChat`, `ChatLinkCode`, `BotCommand`. There's also `WorkspaceMember` (many users per
workspace) and each user has an `activeWorkspaceId`. ~9 schema models and ~28 TS files touch it.

### Why it doesn't fit a personal-money chat app

Your example nails it: **"Talli, send 20k to my NamedJar."** If a user can have multiple
workspaces, the bot can't resolve `NamedJar` — is it the jar in workspace A or B? Every
NL command would need a workspace disambiguation step, which is terrible UX for a chat-first
product. Money apps are **personal by default**: my jars, my collections, my wallet. A
tenant-with-members abstraction is a *team/business* concept that doesn't match "I save and
split with friends."

The multi-workspace model is buying us complexity (an active-workspace selector, workspace
scoping on every query, member roles) to solve a problem this product doesn't have.

### What to do instead

- **Scope everything to `userId`** (the account owner), not `workspaceId`. `Collection`,
  `SavingsJar`, `Payment`, `Transfer`, `Beneficiary`, `BillSplit`, `LinkedChat` all become
  "belongs to a user."
- **Delete `Workspace`, `WorkspaceMember`, `activeWorkspaceId`,** and the workspace switcher UI.
- Collections and bill-splits already model *external* participants (`CollectionMember`,
  payers by name/platform id) — that's the real "sharing," and it doesn't need workspaces.

### The one thing to preserve

If we ever want **business/team accounts** (multiple staff managing one Talli), that's a
genuine future feature — but it should be an explicit "organization" concept added later, not
the default wrapper around every personal user today. Don't keep workspaces "just in case";
add orgs when there's a real business use case. YAGNI wins here.

**Blast radius:** large but mechanical — swap `workspaceId` → `userId` across ~9 models and
their queries, drop 2 models + the switcher. Clearing data removes the migration pain.

---

## 2. Savings jars & virtual accounts — one VA per jar?

You're asking the right operational questions. Let's separate the model from the mechanism.

### Savings jars are just labelled containers — correct

A `SavingsJar` is a named bucket with a `currentAmount` and an optional target. It holds no
special money; it's an accounting label over funds. That's the right mental model and we should
keep it simple.

### The "one VA per jar" problem is real

If we mint a **dedicated Nomba virtual account per jar**, a user with 10 jars needs 10 VAs.
That's a lot to provision, track, and expire — and Nomba VAs are real banking objects, not free
handles. Maintenance (create on jar-create, expire on jar-delete, handle orphaned VAs,
reconcile per-VA) scales with jar count. **This is a genuine downside; per-jar VAs don't scale
gracefully.**

### The better mechanism: ONE VA per user + reference-based routing

Nomba's transaction API supports lookup and polling, so we don't actually need one account per
jar:

- `nomba.transactions.getSingle({ merchantTxRef | orderReference | ... })` — fetch one tx by ref.
- `nomba.transactions.list({ dateFrom, dateTo, cursor })` — page recent txns.
- `nomba.transactions.requery(sessionId)` — re-check a session.
- `nomba.checkout.confirmReceipt(orderReference)` — the poll we already use for flash accounts.

So the pattern that scales:

- **One virtual account per user** (their personal Talli pay-in NUBAN), created lazily on first
  need. Not per jar.
- When they want to fund a specific jar, we create an **intent** (a `Payment` row, see §3)
  carrying the target `savingsJarId` + amount + a unique reference.
- Money lands on the user's VA; we match the inbound transaction to the intent by
  **reference/amount** (webhook preferred, polling via `transactions.getSingle`/`confirmReceipt`
  as the reliable fallback — exactly the model we already run for collections).
- Settle → credit the jar.

This gives the "real account" feel (a stable number the user can save toward) **without**
N accounts per user. One VA, many funding intents.

> Answering directly: **yes, there's a pollable status endpoint** (`transactions.getSingle` /
> `requery` / `confirmReceipt`), so a VA flow does **not** force us onto webhooks-only — we can
> poll just like today. And **no, we should not create 10 VAs for 10 jars** — one VA per user +
> reference routing is the maintainable design.

### Caveat to verify against Nomba

Reference-based routing needs the inbound transfer to carry (or let us derive) a reference we
control, or enough (amount + narration + timing) to match confidently. If Nomba VA credits
don't expose a usable per-transfer reference, we fall back to amount+time matching (weaker) or
accept per-jar VAs for cases that need certainty. **Action: confirm what fields a VA credit
webhook/txn record exposes before committing.**

---

## 3. The wallet is derived, not a real account — mostly right, one nuance

### Your point

We don't really "create a wallet" for users. A user's balance is just the net of their
transactions tagged as wallet activity (money they topped up and haven't spent). So a separate
`Wallet` table with a cached `balance`, plus a parallel `WalletTransaction` ledger, is
redundant when we could have **one centralized transactions table** and derive balance from it.

### What exists today

- `Wallet` — one per user, with a cached `balance` (updated atomically with each ledger row).
- `WalletTransaction` — the ledger; `reason ∈ { topup, savings_deposit, savings_withdrawal,
  collection, send, refund }`; balance = sum of rows.
- Separately, `Payment` already records inbound bank payments (collections, jar funding), and
  `SavingsTransaction` records jar deposits/withdrawals.

So we already have **three** money-movement tables (`Payment`, `WalletTransaction`,
`SavingsTransaction`) with overlapping concerns. That's the real smell — not just the wallet.

### The direction: one ledger to rule them all

A single append-only **`LedgerEntry`** (or reuse/rename `Payment` as the canonical ledger)
with:

- `userId` (owner)
- `direction` (credit / debit) or signed amount
- `kind` (`wallet_topup`, `collection_payment`, `savings_deposit`, `savings_withdrawal`,
  `transfer_out`, `refund`, …)
- optional target refs (`savingsJarId?`, `collectionId?`, `collectionMemberId?`, `transferId?`)
- provider fields (`provider`, `providerOrderId`, `providerReference`, `status`)
- unique `referenceId` for idempotency

Then:

- **Wallet balance** = sum of ledger entries where `kind = 'wallet_topup'` minus what's been
  spent from wallet — i.e. a **derived view**, not a stored table. Exactly your point: the
  wallet is "how much you have from `wallet_topup`-tagged activity," computed, not a row.
- **Jar balance** = sum of ledger entries targeting that `savingsJarId`.
- **Collection collected** = sum targeting that `collectionId`.

One table, one place to look, every movement tagged. `SavingsTransaction` and
`WalletTransaction` collapse into it.

### The one nuance (why "pure derived, no cache" needs care)

Deriving balance by summing the ledger on every read is clean but has two real costs at scale:

1. **Read performance** — summing a growing ledger per balance check gets slow. Usually solved
   with a periodic **balance snapshot / materialized cache** (which is, ironically, what the
   `Wallet.balance` cache is today — just under a confusing name).
2. **Concurrency / double-spend** — "check balance then debit" must be atomic. A cached balance
   updated in the same transaction as the ledger row (current approach) makes the invariant easy
   to enforce; pure-derive needs `SELECT … FOR UPDATE` or a snapshot row to lock against.

So the healthy version of your idea: **one ledger table as the source of truth**, and if we
keep a `balance` number, treat it as an explicit **cache/snapshot** (clearly named), not as a
separate "Wallet account" concept with its own identity. Kill `WalletTransaction` and
`SavingsTransaction` as separate ledgers; keep at most a lightweight per-user balance cache.

**Verdict:** consolidate the three money tables into one ledger; drop the `Wallet` *entity*;
derive balances (with a snapshot cache for the wallet number if perf needs it).

---

## How the three fit together

They reinforce each other:

- Killing **workspaces** (§1) means the ledger and jars key off `userId` — simpler ownership.
- **One VA per user + reference routing** (§2) produces inbound events that land as **ledger
  entries** (§3) tagged by target — collections, jar funding, and wallet top-ups all become the
  same shape with a different `kind`.
- The **unified ledger** (§3) is exactly what §2's reference-matching settles into.

Net: `userId` owns everything; one `LedgerEntry` table records every money movement tagged by
`kind` + optional target; balances (wallet, jar, collection) are derived views; Nomba is one
VA per user, reconciled by reference via the transaction API.

## Suggested sequencing (data can be cleared)

1. **Drop workspaces** — reparent all models to `userId`, delete `Workspace` /
   `WorkspaceMember` / switcher. Biggest surface, but unblocks everything and simplifies the
   NL command resolution immediately.
2. **Unify the ledger** — introduce `LedgerEntry` (or promote `Payment`), migrate wallet +
   savings transactions into it, replace `Wallet` entity with a derived balance (+ optional
   snapshot).
3. **Virtual accounts for savings** — one VA per user, reference-routed funding intents,
   polled via `transactions.getSingle` / `confirmReceipt`; keep flash accounts for one-shot
   collection links if desired. Gate on confirming VA credit reference fields with Nomba.

Each step is independently shippable and each removes a category of confusion rather than
adding one.

## Open questions to close before building

- **VA references:** what does a Nomba VA credit expose that we can match on? (Determines §2.)
- **Business/team accounts:** are they on the roadmap at all? If yes, note it so the `userId`
  reparent leaves room for an `orgId` later; if no, ignore.
- **Balance perf target:** how many ledger rows/user do we expect? (Determines whether we need
  a snapshot cache or can pure-derive.)
