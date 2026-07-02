# Nomba payout and withdrawal audit

Date: 2 July 2026  
Repository revision reviewed: `45f46fd` plus the current uncommitted worktree

## Conclusion

The current payout implementation is not safe enough to release with real money.

Claude's change fixes one narrow case: a Nomba `201 PROCESSING` response is no longer automatically treated as a failed transfer and immediately refunded. That direction is correct. The complete flow is still unsafe because the SDK discards the response data needed for reconciliation, the requery call uses the wrong reference parameter, documented pending states can be refunded, webhook verification does not match Nomba's payload shape, and the database operations around wallet, collection, and savings withdrawals are not atomic.

The payout endpoints should remain disabled until the transfer lifecycle and balance mutations are corrected.

## Scope

This review covered:

- Every payout and withdrawal file currently shown by `git status`.
- `transfer.service.ts`, `ledger.service.ts`, transfer persistence, reconciliation cron, and webhook handling.
- The in-repository Nomba SDK: HTTP client, errors, transfer resource, transaction resource, types, and webhook helper.
- Nomba's current transfer lifecycle guide, API reference, OpenAPI document, error codes, requery endpoints, webhook specification, and idempotency guidance.
- Wallet withdrawals, collection withdrawals, and the new savings-to-wallet withdrawal.

No application code was changed during this audit.

## What Claude changed

The current worktree adds or changes:

- A new authenticated `POST /wallet/withdraw` endpoint.
- A new authenticated `POST /collections/:id/withdraw` endpoint and collection-withdrawable calculation.
- A new authenticated `POST /savings/:id/withdraw` endpoint.
- Web API methods, hooks, and types for wallet and savings withdrawals.
- Collection-funded payouts in `transfer.service.ts`.
- `Transfer.sourceCollectionId` and its migration.
- New payout status parsing intended to preserve `PROCESSING` as pending.
- Collection-specific refund handling.
- Documentation in `docs/withdrawals-and-payout-status.md`.

The Nomba SDK files themselves were not changed. The service was modified to work around SDK behavior instead of correcting the SDK contract.

## Nomba's documented contract

### Transfer request

Nomba documents the parent-account payout as:

```text
POST /v2/transfers/bank
```

The request fields used by our SDK are correct:

- `amount`
- `accountNumber`
- `accountName`
- `bankCode`
- `merchantTxRef`
- `senderName`
- optional `narration`

Nomba requires a ten-digit account number. Our new wallet and collection schemas accept lengths from 6 to 20, so invalid values reach the provider unnecessarily.

Source: [Nomba transfer-to-bank guide](https://developer.nomba.com/docs/products/transfers/transfer-to-banks), [parent transfer API reference](https://developer.nomba.com/nomba-api-reference/transfers/perform-bank-account-transfer-from-the-parent-account).

### Transfer lifecycle

Nomba documents these initial states:

- `SUCCESS`: completed.
- `PENDING_BILLING`: accepted and still processing.
- `NEW`: accepted and still processing.
- HTTP `201` with `description: PROCESSING`: accepted, final outcome unavailable, keep pending.

Nomba says to retain the original `merchantTxRef`, not issue a new transfer while pending, and wait for a webhook or poll for the final state.

For final reconciliation, the current transaction schema says:

- `SUCCESS`: successful and terminal.
- `REFUND`: failed and refunded to the Nomba account; terminal.
- `PENDING_BILLING`: pending.
- `CANCELLED`: pending according to Nomba's current schema description.
- `PAYMENT_FAILED`: pending according to Nomba's current schema description.
- `REVERSED_BY_VENDOR`: pending according to Nomba's current schema description.

That last group is important: our code currently treats `PAYMENT_FAILED` as terminal and immediately credits the user's internal balance. Nomba's current published `TransactionResult` description does not say that `PAYMENT_FAILED` proves the Nomba account has been refunded. Only `REFUND` carries that guarantee.

Sources: [Nomba transfer lifecycle](https://developer.nomba.com/docs/products/transfers/transfer-to-banks), [Nomba OpenAPI](https://developer.nomba.com/nomba-api-reference/openapi.json), [Nomba error and status codes](https://developer.nomba.com/docs/api-basics/error-codes).

### Requery contract

Nomba's preferred polling flow is:

1. Save the transfer's returned `data.id`.
2. Query:

   ```text
   GET /v1/transactions/accounts/single?transactionRef=<data.id>
   ```

The same endpoint separately supports:

```text
merchantTxRef=<our merchant reference>
```

`transactionRef` and `merchantTxRef` are different query parameters with different meanings.

Sources: [transfer lifecycle requery section](https://developer.nomba.com/docs/products/transfers/transfer-to-banks), [parent-account transaction lookup](https://developer.nomba.com/nomba-api-reference/requery/fetch-a-single-transaction-on-the-parent-account).

### Idempotency

Nomba describes `merchantTxRef` as the transfer's unique transaction reference. A retry of the same operation must retain the same reference.

Nomba also recommends sending an `X-Idempotent-key` header for bank transfers. Identical retries with the same key are processed once; a conflicting retry is rejected.

Source: [Nomba webhook and idempotency documentation](https://developer.nomba.com/docs/api-basics/webhook).

### Webhooks

Nomba recommends webhooks for the final authoritative payout result and publishes these payout events:

- `payout_success`
- `payout_failed`
- `payout_refund`

The signature input uses nested values:

```text
event_type
requestId
data.merchant.userId
data.merchant.walletId
data.transaction.transactionId
data.transaction.type
data.transaction.time
data.transaction.responseCode
nomba-timestamp
```

Nomba retries a webhook up to five additional times when the receiver does not return a `2XX`.

Source: [Nomba webhook documentation](https://developer.nomba.com/docs/api-basics/webhook).

## Nomba documentation inconsistency

Nomba's general error-code page says successful API responses use `code: "00"`.

The bank-transfer API reference and OpenAPI document show the transfer endpoint using:

- `code: "200"` for a normal response.
- `code: "201"` for processing.

The transfer guide also shows another top-level shape containing `successful`, `status`, `message`, and `data`.

This inconsistency is a reason to preserve and normalize the complete transfer response at the transfer resource boundary. It is not safe to discard `data` merely because one generic envelope rule did not match.

## SDK comparison

| Area | Nomba contract | Current SDK | Finding |
|---|---|---|---|
| Base URLs | `https://sandbox.nomba.com` and `https://api.nomba.com` | Same | Correct |
| Authentication | Bearer token and `accountId` header | Sends both | Correct |
| Bank list endpoint | `GET /v1/transfers/banks` | Same | Correct path |
| Bank list result | `data: { results: Bank[] }` | Declares and returns `Bank[]` | Incorrect response shape |
| Account lookup | `POST /v1/transfers/bank/lookup` with account number and bank code | Same | Correct |
| Bank transfer request | `POST /v2/transfers/bank` with documented fields | Same | Correct request path and fields |
| Transfer success envelope | Published transfer material permits `200`, `201`, and more than one top-level shape | Generic client accepts only `code: "00"` | Incorrect for the documented transfer endpoint |
| Transfer error object | Processing responses include useful `data.status` and sometimes `data.id` | `NombaError` stores only code and description | Loses reconciliation evidence |
| Transfer amount type | OpenAPI defines transfer result amount as a string | SDK declares a number | Incorrect type |
| Requery by provider ID | Pass `data.id` as `transactionRef` | Ignores saved `nombaTxId` | Incorrect |
| Requery by merchant reference | Pass the value using `merchantTxRef` | Passes `merchantTxRef` as `transactionRef` | Incorrect parameter/value pairing |
| Idempotency header | `X-Idempotent-key` recommended | No support for custom request headers; header omitted | Missing |
| Final statuses | Only `SUCCESS` and `REFUND` have documented terminal meaning | Treats `PAYMENT_FAILED` as terminal failure | Incorrect refund trigger |
| Unknown statuses | Keep pending and investigate | Mostly pending | Correct default, except for error-code handling |
| Webhook signature | Reads nested merchant and transaction fields | Reads the same field names from the top-level `data` object | Incorrect |
| Webhook settlement | Final payout events should update the transfer idempotently | Valid webhooks are only recorded, never applied | Incomplete |

## Verified SDK behavior

A temporary script outside the repository exercised the current SDK with representative official responses. The script was deleted after execution.

It confirmed:

- HTTP 200 with `code: "200"`, `description: "SUCCESS"`, and `data.status: "PENDING_BILLING"` throws `NombaError`.
- HTTP 201 with `code: "201"`, `description: "PROCESSING"`, and `data.status: "PENDING_BILLING"` throws `NombaError`.
- The bank list returns `{ results: [...] }` at runtime, while `resolveBank()` expects an array and calls `.find()`.
- `transfers.requery("talli_send_abc")` constructs:

  ```text
  /v1/transactions/accounts/single?transactionRef=talli_send_abc
  ```

  That passes a merchant reference under the provider-transaction parameter.

- The bank-transfer request does not include `X-Idempotent-key`.
- A signature generated from Nomba's documented webhook field order is rejected by `WebhookResource.verifySignature()`.
- `isRejection()` classifies Nomba code `01` with `Generic error` as a definite rejection.
- `mapStatus()` classifies `PAYMENT_FAILED` as failed and refundable.
- The free-text parser reads `UNSUCCESSFUL` as `SUCCESS` because it uses substring matching.

### Background retry bug

The temporary test also demonstrated that the HTTP client continues retrying after it has already rejected the caller's promise.

The client currently does:

```ts
bail(error);
throw error;
```

The installed `async-retry` implementation makes `bail()` reject the outer promise but does not stop the current attempt by itself. Throwing afterward enters its retry handler and schedules more attempts.

Consequences:

- The service can receive a `201 PROCESSING`, return pending to its caller, and still issue additional transfer POST requests in the background.
- A normal response rejected because of `code: "200"` can also trigger background POST retries.
- These retries retain `merchantTxRef`, which helps, but the recommended `X-Idempotent-key` is missing.
- This directly contradicts Nomba's instruction not to re-initiate a transfer after receiving a processing response.

## Status handling findings

### `201 PROCESSING`

Current result:

```text
NombaError(description=PROCESSING)
-> parse as PENDING_BILLING
-> internal status pending
```

This specific status decision is correct. It is implemented indirectly through an exception and loses `data.id`.

### `code: "200"` with a pending `data.status`

The published transfer schema permits the response envelope to say `description: SUCCESS` while the actual transaction in `data.status` is `PENDING_BILLING`.

Current result:

```text
generic client rejects code 200
-> NombaError(description=SUCCESS)
-> free-text parser returns SUCCESS
-> internal status sent
```

The transaction is marked final without reading its actual pending status. Because only pending rows are polled, it will never be reconciled.

### `REFUND`

When the client successfully returns `data.status: REFUND`, the service marks the transfer failed and restores the internal source balance. This agrees with Nomba's documented guarantee that the Nomba account has been refunded.

The database write sequence used to apply that refund is still unsafe for collection payouts, as described below.

### `PAYMENT_FAILED`

Current code treats `PAYMENT_FAILED` like `REFUND` and restores the user's internal balance.

Nomba's current transaction schema describes `PAYMENT_FAILED` as pending, not as proof of refund. Crediting the user before receiving `REFUND` can make the internal wallet spendable while the platform's Nomba balance has not been restored.

### Generic Nomba error code `01`

Nomba describes code `01` as a generic, retryable error. It does not prove that a transfer was never accepted.

Current `isRejection()` treats every concrete non-`00` code without a recognized status word as a definite rejection. It immediately refunds the internal wallet. This violates Nomba's “when in doubt, treat unknown responses as pending” guidance.

### Transport uncertainty

Network and unparseable-response failures have `nombaCode: null` and remain pending. That is the correct fail-closed behavior.

## Persistence and money-movement findings

### No durable transfer exists before calling Nomba

`payout()` currently performs this order:

1. Debit the internal source.
2. Call Nomba.
3. Create the `Transfer` row.

If the process exits after the debit or after Nomba accepts the transfer but before `Transfer.create()`, there is no transfer row for the reconciliation cron or operations team to find.

Possible outcomes include:

- The user's wallet remains debited even though no provider request was made.
- Nomba sends money but Talli has no durable transfer record.
- A client retry creates a new `merchantTxRef` and sends a second payout.

The internal intent must exist before the external side effect.

### Wallet debits are vulnerable to concurrent lost updates

`ledgerService.applyEntry()`:

1. Reads `walletBalance`.
2. Calculates `balanceAfter` in application memory.
3. Creates the payment.
4. Sets the user's balance to that precomputed value.

Two concurrent withdrawals can read the same starting balance, create different debit entries, and both write the same final balance. Both calls can then send money to Nomba even though the wallet was only reduced once.

The preliminary `getBalance()` in `payout()` does not prevent this. It occurs outside the ledger transaction.

### Client retries are not idempotent at the Talli boundary

Every invocation of `payout()` generates a new `merchantTxRef`.

There is no client-supplied operation key, persisted withdrawal request ID, or atomic “create once” boundary. A double-click, browser retry, proxy retry, or caller retry is treated as a new payout.

Nomba can only deduplicate requests that reach it with the same reference. Talli currently generates a different reference for each repeated API invocation.

### Collection availability check and debit are not atomic

`collectionService.withdraw()` calculates the available amount, returns to application code, and later creates a collection debit.

Two concurrent requests can both observe the same available balance and both pass the check. Each receives a different `merchantTxRef`, each creates a debit, and each can send an external payout. There is no locked collection balance or conditional atomic decrement.

This can pay out more than the collection received.

### Collection refund and transfer state are not atomic

For a failed collection payout, reconciliation:

1. Creates a refund `Payment`.
2. Updates the `Transfer` to failed.

These writes are separate. If the first succeeds and the second fails, the next poll attempts to create the same unique refund again, throws a uniqueness error, and never advances the transfer state.

The unique `referenceId` prevents a double refund, but the transfer can remain pending forever.

### Savings withdrawal can create money

The new `withdrawToWallet()` claims to move jar funds atomically, but it does not use one transaction:

1. Read the jar amount.
2. Credit the wallet.
3. Decrement the jar.

If execution stops after the wallet credit, the jar remains unchanged and money has been created.

Two concurrent withdrawals can both pass the balance check, both credit the wallet, and then decrement the jar below zero.

This issue is not part of the Nomba API, but it is part of Claude's current payout/withdrawal worktree.

### Reconciliation stops permanently

The cron polls every ten seconds and stops selecting a transfer after 60 attempts. That is approximately ten minutes.

Nomba says typical processing can take up to roughly three minutes, so ten minutes is a reasonable initial window. However, provider downtime, a broken query, or webhook failure leaves the transfer pending but permanently excluded from automated reconciliation. There is no manual-review state, recovery queue, or later sweep.

### Multiple cron workers do not claim a transfer

Every engine instance can select and process the same pending transfer. There is no row claim, lease, conditional terminal transition, or transaction encompassing refund plus state update.

Wallet refunds happen to be deduplicated by `Payment.referenceId`. Collection refunds do not recover cleanly from the partial-write case described above.

## Webhook findings

The current webhook implementation cannot serve as the authoritative fallback described by Nomba:

- Signature generation reads `userId`, `walletId`, `transactionId`, `type`, `time`, and `responseCode` from `data`.
- Nomba documents those fields under `data.merchant` and `data.transaction`.
- A correctly signed official-format payload fails verification.
- Invalid signatures return HTTP 200 with `{ accepted: false }`, so Nomba considers delivery successful and will not retry.
- Valid webhook events are only saved for audit.
- `payout_success`, `payout_failed`, and `payout_refund` never update a `Transfer`.

The system therefore depends entirely on polling, while the polling query is currently incorrect.

## API and UI consistency findings

- The new `/wallet/withdraw` controller correctly describes pending as processing.
- Telegram correctly describes pending as processing.
- The older `/transfers` controller treats every non-sent result as HTTP 502 with “Transfer failed, wallet refunded,” even when the service returned pending and did not refund.
- A client reacting to that 502 can retry and create another payout with a new reference.
- New wallet and collection schemas accept bank account numbers that are not ten digits.
- The REST withdrawal rate limiter permits ten calls per minute, while Nomba documents a limit of five transfers to the same recipient per minute.

## Type and build checks

`bun --filter @app/engine type-check` currently fails before checking these changes because `tsconfig.json` includes three files under `scripts/` while `rootDir` is `src`.

The reported files are:

- `scripts/check-webhooks.ts`
- `scripts/inspect-topup.ts`
- `scripts/test-va-transactions.ts`

Running the equivalent compiler check with `rootDir` widened to the engine directory succeeds:

```text
bunx tsc --noEmit --rootDir .
```

Compilation success does not exercise any of the financial race, status, or provider-contract failures above.

## Required behavior before production

The safe payout contract should be:

1. Accept or create one stable Talli withdrawal-operation ID.
2. Atomically reserve/debit the correct source and persist a pending `Transfer` before calling Nomba.
3. Use that stable ID as `merchantTxRef` and `X-Idempotent-key`.
4. Make retries reuse the same persisted operation and provider reference.
5. Parse the transfer endpoint's complete response, preserving HTTP status, envelope code, `data.id`, and `data.status`.
6. Mark only `SUCCESS` as sent.
7. Restore the internal source only after `REFUND`, or after a separately documented rejection that proves Nomba did not accept the transfer.
8. Keep `NEW`, `PENDING_BILLING`, `PAYMENT_FAILED`, `CANCELLED`, `REVERSED_BY_VENDOR`, transport errors, unknown codes, and unknown statuses pending.
9. Requery with saved `nombaTxId` as `transactionRef`, with a correct `merchantTxRef` lookup as fallback.
10. Process verified payout webhooks idempotently and verify their transaction details before settling.
11. Apply refund and terminal transfer transition in one database transaction.
12. Use atomic balance predicates or row locking for wallet, collection, and savings balances.
13. Provide a manual-review/reconciliation path for transfers that exceed the polling window.

## Final assessment

Claude correctly recognized that `PROCESSING` is not a failure. The implementation around that insight is incomplete and, in several paths, still financially unsafe.

The most important factual answer is:

> A Nomba transfer must not be considered failed and internally refunded until Nomba reports `REFUND`. A thrown SDK error, `PAYMENT_FAILED`, a generic response code, a timeout, or an unknown state is not sufficient proof.

The current code does not consistently enforce that rule, and the surrounding database workflow does not prevent duplicate or overdrawn payouts.
