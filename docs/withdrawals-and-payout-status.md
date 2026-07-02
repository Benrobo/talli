# Withdrawals + payout status handling

Status: in progress. The critical payout-status bug is fixed; the three withdraw flows are the remaining build.

## 1. The critical bug that was fixed first (double-spend on PROCESSING)

Live Nomba returned a bank transfer as `PROCESSING` — a 200 response whose envelope `code` is not `"00"`. Our HTTP client throws on any non-`"00"` code, so an accepted, in-flight transfer surfaced as a thrown error. `payout` then did `mapStatus(threw=true) -> "failed"` and **credited a refund** — while the money was actually leaving Nomba. That is a double-spend: money sent AND wallet refunded.

### Verified against the live Nomba docs (developer.nomba.com/docs/products/transfers/transfer-to-banks)

The authoritative bank-transfer responses are:

- Success — HTTP 200, `{ "code": "00", "description": "SUCCESS", "status": true, "data": { "id": "...", "status": "SUCCESS" } }`
- Processing — HTTP **201**, `{ "code": "201", "description": "PROCESSING", "message": "Unable to process response, please rely on web hook", "status": false, "data": { "status": "PENDING_BILLING" } }`
- Failed — `{ "code": "00", "description": "SUCCESS", "status": false, "data": { "id": "...", "status": "REFUND" } }`

Key facts from the docs:
- A `201` means the request was received but the outcome isn't known yet — rely on the webhook / requery. `data.status` is `PENDING_BILLING` or `NEW` while in flight.
- Terminal states: `data.status === "SUCCESS"` (done) and `data.status === "REFUND"` (failed, and **Nomba auto-refunds its own account** + sends a refund webhook).
- Do NOT re-initiate a pending transfer with a new reference. Requery by `data.id` / merchantTxRef; NIBSS can take up to ~3 minutes.
- Retry only after a `REFUND`, and only with a NEW `merchantTxRef`.

Note on refunds: Nomba's auto-refund is on the Nomba account. Our wallet debit is an internal ledger entry, so our `mapStatus(REFUND) -> failed -> ledger refund` credits the user's Talli wallet back — that is correct and not a double-refund (different balances). The old bug was refunding on `PROCESSING`, which is in-flight, not failed.

(The repo's older `docs/nomba-api.md` section 6.3 omitted `PROCESSING`/the 201 case — corrected here from the live docs.)

Fix (in `transfer.service.payout`):
- A thrown `NombaError` is only treated as a REJECTION (refund is safe) when it is a concrete non-`"00"` business code that carries no accepted/in-flight status. Transport errors (null code) and any error whose description contains a known transfer status (`PROCESSING`, `PENDING_BILLING`, `NEW`, `PAYMENT_SUCCESSFUL`, etc.) are held as PENDING — never refunded.
- `PROCESSING` maps to `PENDING_BILLING` for our purposes, so the transfer row is `pending` and the existing reconcile cron (`reconcileTransfer` -> requery) finalizes it to `sent` or `failed` (refunding only then).
- The safe default is PENDING when uncertain: leaving a truly-failed transfer pending is recoverable by the cron; refunding a real in-flight transfer is not.
- Separated the `else if (input.alias)` branch: refund-on-failure and save-beneficiary are now independent decisions (save whenever the send did not fail).

Rule going forward: a transfer is `failed` (and refundable) ONLY on `REFUND`/`PAYMENT_FAILED` or a clear rejection. Everything else is `pending` until the webhook/requery says otherwise.

## 2. The three withdraw flows

All three deduct from a source and either pay out to a bank (wallet, collection) or move to the wallet (savings).

### Wallet withdraw (to bank)
- Debit the wallet, then run the same `transferService.payout` used for send-money. Reuses all the fixed status handling above.
- Result can be `sent` / `pending` / `failed`. A `pending` withdrawal shows as pending and reconciles from the cron.

### Collection withdraw (to bank)
- Deduct from the collection's collected total, then payout to the chosen bank.
- Owner-only. Amount cannot exceed the collection's available (collected minus already withdrawn).
- Records the movement so the collection total reflects the withdrawal, then triggers the same bank payout with pending/processing handling.

### Savings withdraw (to wallet)
- No bank. Move funds from the jar to the wallet: decrement jar `currentAmount`, credit wallet via the ledger (`savings_withdrawal` kind), in one transaction. Synchronous — no Nomba call, so it is immediately done (success UI).

## 3. Shared UI (frontend)

- A reusable "withdraw to bank" bottom sheet (amount + bank picker + confirm) used by wallet and collection. On submit it calls the endpoint; a `sent` shows success, a `pending`/`processing` shows a "withdrawal is processing" state, a `failed` shows the reason.
- Savings uses a simpler amount-only bottom sheet -> success ("moved to wallet") since it is synchronous.

## 4. Endpoints
- Wallet: `POST /api/wallet/withdraw` (amount, accountNumber, bankName)
- Collection: `POST /api/collections/:id/withdraw` (amount, accountNumber, bankName) — owner only
- Savings: `POST /api/savings/:id/withdraw` (amount) — moves to wallet
