# Nomba API — Talli Reference

A Talli-specific reference for the [Nomba API](https://developer.nomba.com/docs/) —
think of it as a "mini Postman" scoped to the endpoints Talli actually uses:
auth, accept payments (Checkout + virtual accounts), Nigeria payout (bank
lookup, bank codes, transfer to banks, wallet transfer), account balance,
transactions, webhooks, and Global Payout.

Source of truth is the Nomba **OpenAPI spec** (`Vendor API`, version `1.0.0`,
`https://raw.githubusercontent.com/kudi-inc/vendor-openapi-spec/main/openapi3_0_v_1_0_0.json`).
Paths, methods, request fields, and `required` markers below have been
**verified against that spec**. The prose docs at `developer.nomba.com`
occasionally disagree with the spec — those conflicts are called out inline with
⚠️. Anything not present in the spec is marked **(prose only — verify before use)**.

### Verification status

| Area | Status |
|---|---|
| **Auth (token issue), balance, bank codes, bank lookup, checkout create** | ✅✅ **verified live against the sandbox** (real calls succeeded — see §3 note) |
| Transactions, checkout fetch/cancel, virtual accounts, transfers | ✅ verified against OpenAPI 1.0.0 (not yet run live) |
| Checkout **refund** | ❌ no such path in the spec — **prose only, do not assume** |
| **Global Payout** (§10) | ❌ not in OpenAPI 1.0.0 — **prose only** |
| Webhook event names + signing string (§9) | ⚠️ from prose/guides, not the OpenAPI spec — validate against a real sandbox webhook |
| Transfer path `v1` vs `v2` | ⚠️ spec says `/v1/transfers/bank`; some prose pages say `/v2/...` — confirm in sandbox |

---

## 1. Environments

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.nomba.com` |
| Production (live) | `https://api.nomba.com` |

Sandbox credentials only work against the sandbox URL and vice-versa. Talli
selects the base URL from `NOMBA_ENV` (`test` → sandbox, `live` → production).

---

## 2. Response envelope

Every Nomba response uses the same envelope:

```json
{ "code": "00", "description": "Success", "data": { } }
```

- `code` `"00"` means success. **A `200` HTTP status does not guarantee success —
  always check `code`.**
- On errors `data` is usually `null` and `description` carries the message.

Common codes: `00` success · `01` generic/retryable · `02` validation · `05`
not permitted · `06` do-not-retry. HTTP: `400` bad payload · `401` token
missing/expired · `403` forbidden · `404` not found · `422` validation · `429`
rate limited · `500` server error.

---

## 3. Authentication

OAuth2 client-credentials. Obtain a short-lived access token, send it as a
Bearer token on every other call. **Token lifetime is ~30 minutes.**

### 3.1 Obtain access token

`POST /v1/auth/token/issue`

Headers:
```
Content-Type: application/json
accountId: <parent account UUID>
```

Body:
```json
{
  "grant_type": "client_credentials",
  "client_id": "<NOMBA_CLIENT_ID>",
  "client_secret": "<NOMBA_PRIVATE_KEY>"
}
```

Response:
```json
{
  "code": "00",
  "description": "Success",
  "data": {
    "businessId": "01a10aeb-d989-460a-bbde-9842f2b4320f",
    "access_token": "<JWT>",
    "refresh_token": "01h4gdx2tctxfjgacbdwrcvs5d1688473602892",
    "expiresAt": "2026-07-08T14:33:00Z"
  }
}
```

### 3.2 Refresh token

`POST /v1/auth/token/refresh` · headers `Authorization: Bearer <token>`, `accountId`

```json
{ "grant_type": "refresh_token", "refresh_token": "<refresh_token>" }
```

Returns the same `data` shape as issue. Refresh proactively ~5 min before
`expiresAt` rather than on a 401.

### 3.3 Revoke token

`POST /v1/auth/token/revoke`

```json
{ "clientId": "<client id>", "access_token": "<JWT to revoke>" }
```

### Standard headers (every authenticated call)

```
Authorization: Bearer <access_token>
accountId: <parent account UUID>   // NOMBA_PARENT_ACCOUNT_ID
Content-Type: application/json      // on POST/PUT
```

> **Talli:** cache the token in Redis keyed by env, with TTL = `expiresAt - now - 60s`.
> The SDK (§11) handles fetch/cache/refresh transparently so callers never touch tokens.

> ✅ **Verified live (sandbox).** `POST /v1/auth/token/issue` with the body creds
> (no `Authorization` header) returns `code "00"` + an `access_token`. The TEST
> creds work against `sandbox.nomba.com`; both TEST and LIVE creds also succeeded
> against `api.nomba.com`, so the token endpoint is not host-strict.
>
> ⚠️ **Error shapes that look identical but aren't:**
> - wrong/unknown `client_id` → `404 "Client record not found or client has been suspended"`
> - known `client_id` + bad `client_secret` → `403 "Forbidden error"`
> - missing `accountId` header → `400 "AccountId not passed in header."`
> - any `Authorization` header on token issue → `400 "JWT strings must contain exactly 2 period characters"` (the endpoint takes **no** auth header)
>
> ⚠️ **`.env` gotcha:** the `NOMBA_PRIVATE_KEY` (client_secret) is base64-padded and
> ends in `==`. A stray extra `=` (e.g. `…MPw===`) silently produces a `403` that is
> indistinguishable from a wrong secret. Copy it exactly from
> `docs/nomba-test-credentials.md`.

---

## 4. Accept Payments — Checkout

Hosted payment page. Talli uses this for **collection payments** and
**savings-jar funding**: create an order, redirect the payer to `checkoutLink`,
confirm via webhook.

### 4.1 Create checkout order

`POST /v1/checkout/order`

```json
{
  "order": {
    "orderReference": "<unique uuid/string>",
    "customerId": "optional",
    "callbackUrl": "https://<talli>/api/nomba/webhook",
    "customerEmail": "payer@example.com",
    "amount": 3000,
    "currency": "NGN",
    "accountId": "<optional subaccount>",
    "splitRequest": {
      "splitType": "PERCENTAGE",
      "splitList": [{ "accountId": "<subaccount>", "value": 100 }]
    }
  },
  "tokenizeCard": false
}
```

Spec-verified `order` fields: `orderReference`, `customerId`, `callbackUrl`,
`customerEmail`, `amount`, `currency`, `accountId`, `splitRequest`. **Required**:
`callbackUrl`, `customerEmail`, `amount`, `currency`. In the spec `currency`
enum is **`NGN` only** (prose mentions USD/CDF). `allowedPaymentMethods` and
`orderMetaData` appear in prose examples but are **not in OpenAPI 1.0.0** — don't
rely on them without checking.

Response:
```json
{
  "code": "00",
  "description": "Success",
  "data": {
    "success": true,
    "message": "success",
    "checkoutLink": "https://pay.nomba.com/sandbox/<token>",
    "orderReference": "<uuid>"
  }
}
```

> ✅ **Verified live (sandbox).** `data` also carries `success` + `message`, and
> the link host is `pay.nomba.com/sandbox/…` (not `checkout.nomba.com`). Talli
> only consumes `checkoutLink` + `orderReference`; the extra fields are harmless.

`checkoutLink` = the hosted page Talli sends the payer to. `orderReference` =
the key Talli stores on the `payments` row to reconcile the webhook.

### 4.2 Fetch / verify checkout transaction

`GET /v1/checkout/transaction` — query params `idType` (`ORDER_ID | ORDER_REFERENCE`)
and `id`; header `accountId` required.

Use to verify a payment server-side (never trust the front-end redirect).
Also available: `GET /v1/checkout/order/{orderReference}` and
`POST /v1/checkout/confirm-transaction-receipt`.

Spec-verified alternative (recommended for Talli reconciliation):
`GET /v1/transactions/accounts/single` with one of the query params
`transactionRef`, `merchantTxRef`, `orderReference`, `orderId` (header `accountId`
required) → `data.status` `SUCCESS | FAILED`, `amount`, `entryType`, etc.

### 4.3 Cancel checkout transaction

`POST /v1/checkout/transaction/cancel`
```json
{ "transactionId": "<tx id>", "forceCancel": false }
```
Both `transactionId` and `forceCancel` are **required**. (Note: cancel keys on
`transactionId`, not `orderReference`.)

### 4.4 Refund

❌ **No refund path exists in OpenAPI 1.0.0.** The prose docs reference refunds,
but there is no machine-verified endpoint. Do **not** implement a refund call
against an assumed `/v1/checkout/refund` — confirm the real endpoint with Nomba
first.

> **Talli:** `create order` → store `orderReference` on `payments` (status `pending`)
> → redirect to `checkoutLink` → on `payment_success` webhook verify with §4.2 and
> credit the collection member / savings jar idempotently.

---

## 5. Accept Payments — Virtual Accounts

A dedicated NUBAN that auto-routes received bank transfers to the parent
account. Talli can show this as an alternative to Checkout (pay-by-transfer).

### 5.1 Create virtual account

`POST /v1/accounts/virtual`
```json
{
  "accountRef": "<unique ref>",
  "accountName": "Benaiah Football Dues"
}
```

Spec-verified body: only `accountRef` and `accountName`, **both required**.
`bvn`, `expiryDate`, `expectedAmount` show up in prose examples but are **not in
OpenAPI 1.0.0** — verify before sending.

Response:
```json
{
  "code": "00",
  "description": "Success",
  "data": {
    "createdAt": "2026-09-04T07:09:06.900Z",
    "accountHolderId": "01a10aeb-...",
    "accountRef": "1oWbJQQHLyQqqf1SwxjSpudeA21",
    "accountName": "Daniel Scorsese",
    "bankName": "Nombank MFB",
    "bankAccountNumber": "9391076543",
    "bankAccountName": "Nomba/Ifeoluwa Adeboye",
    "currency": "NGN",
    "callbackUrl": "https://webhook.site/...",
    "expired": false
  }
}
```

`bankAccountNumber` + `bankName` are what Talli shows the payer. Funds received
route to the parent account and fire a `payment_success` webhook.

### 5.2 Other virtual-account endpoints

| Action | Method + path |
|---|---|
| Fetch one | `GET /v1/accounts/virtual/{accountRef}` |
| Filter / list | `POST /v1/accounts/virtual/list` (+ `?limit=&cursor=`) |
| Update | `PUT /v1/accounts/virtual/{accountRef}` |
| Expire | `DELETE /v1/accounts/virtual/{accountRef}` |

(Path param is `accountRef`. All require the `accountId` header.)

---

## 6. Nigeria Payout — Transfers

Talli's **Send Mode**: P2P-to-bank, collection payouts, jar withdrawals.
Flow: fetch bank codes → lookup recipient name → confirm with user → transfer.

### 6.1 Fetch bank codes and names

`GET /v1/transfers/banks` →
```json
{ "code": "00", "description": "Success",
  "data": [ { "name": "Access Bank", "code": "044" } ] }
```

> ✅ **Verified live (sandbox).** `data` is a **plain array** of `{ name, code }`
> — NOT `{ results: [...] }` as earlier drafts (and some prose) showed. `code`
> is a **numeric NIBSS string** like `"044"`, NOT a mnemonic like `"GTB"`. The
> sandbox returned 77 banks. Whatever you pass as `bankCode` in lookup/transfer
> must be one of these numeric codes.

Rarely changes — **cache it** (e.g. daily). The `code` is the `bankCode` used
in lookup and transfer.

### 6.2 Bank account lookup

`POST /v1/transfers/bank/lookup`
```json
{ "accountNumber": "0123456789", "bankCode": "044" }
```
```json
{ "code": "00", "description": "Success",
  "data": { "accountNumber": "0123456789", "accountName": "M.A Animashaun" } }
```
(Spec-verified: name is at `data.accountName`.)

Always run this before a transfer and show `accountName` in the confirmation
card (matches the PRD's parse-and-confirm rule).

### 6.3 Transfer to bank (from parent account)

`POST /v1/transfers/bank`  ⚠️ (some prose pages say `/v2/transfers/bank` — the
OpenAPI 1.0.0 spec says `/v1`; confirm in sandbox before going live)
```json
{
  "amount": 5000,
  "accountNumber": "0123456789",
  "accountName": "M.A Animashaun",
  "bankCode": "044",
  "merchantTxRef": "<unique idempotency key>",
  "senderName": "Benaiah Football Club",
  "narration": "Saturday football payout"
}
```

**Required** (per spec): `amount`, `accountNumber`, `accountName`, `bankCode`,
`merchantTxRef`, `senderName`. `narration` optional.

Response (spec-verified `200`):
```json
{
  "code": "00",
  "description": "Success",
  "data": {
    "id": "API-TRANSFER-...",
    "status": "PENDING_BILLING",
    "type": "transfer",
    "amount": 5000,
    "fee": 10,
    "timeCreated": "2026-03-08T19:26:34.657Z",
    "meta": {
      "merchantTxRef": "<your ref>",
      "rrn": "230908202632",
      "api_client_id": "...",
      "api_account_id": "..."
    }
  }
}
```

- `status` enum: `NEW | PENDING_PAYMENT | PAYMENT_SUCCESSFUL | PAYMENT_FAILED | PENDING_BILLING | SUCCESS | REFUND`.
  For Talli: `SUCCESS` (done) · `PENDING_BILLING` (wait for webhook) · `REFUND`
  (failed, auto-refunded — safe to retry with a new ref).
- Your `merchantTxRef` echoes back at `data.meta.merchantTxRef`; the NIBSS
  `rrn` is at `data.meta.rrn`. The Nomba transaction id is `data.id`.
- **The webhook is the authoritative final status.** NIBSS can take up to ~3 min.
- `merchantTxRef` is the idempotency key — unique per transfer, never reuse for a new attempt.
- Rate limit: max **5 transfers to the same recipient per minute**.

Sub-account variant: `POST /v1/transfers/bank/{subAccountId}` (must be enabled by Nomba).

### 6.4 Wallet transfer (Nomba-to-Nomba P2P)

`POST /v1/transfers/wallet`
```json
{ "amount": 2000, "receiverAccountId": "<uuid>", "merchantTxRef": "<unique>", "narration": "optional" }
```
**Required**: `amount`, `receiverAccountId`, `merchantTxRef`. Completes
synchronously (no `sessionId`). Sub-account variant:
`POST /v1/transfers/wallet/{subAccountId}`. Post-MVP for Talli (wallet-to-wallet).

### 6.5 Transaction status / requery

| Need | Endpoint |
|---|---|
| By ref | `GET /v1/transactions/accounts/single?transactionRef=` (also `merchantTxRef`/`orderReference`/`orderId`) |
| By session id | `GET /v1/transactions/requery/{sessionId}` |
| Sub-account single | `GET /v1/transactions/accounts/{subAccountId}/single?transactionRef=<ref>` |

---

## 7. Account balance

`GET /v1/accounts/balance` (parent) · `GET /v1/accounts/{subAccountId}/balance` (sub)

```json
{ "code": "00", "description": "Success",
  "data": { "amount": "281946.0", "currency": "NGN", "timeCreated": "2026-03-08T14:56:59.000Z" } }
```

Talli checks available balance before allowing a payout/withdrawal.

---

## 8. Transactions

- List: `GET /v1/transactions/accounts?limit=&cursor=&dateFrom=&dateTo=`
- Filter: `POST /v1/transactions/accounts` with a body of optional filters
  (`status`, `source`, `type`, `merchantTxRef`, `orderReference`, `rrn`, …)
- Single: `GET /v1/transactions/accounts/single?transactionRef=|orderReference=`

Result item shape (abridged):
```json
{ "id": "...", "status": "SUCCESS", "amount": 4000, "type": "online_checkout",
  "source": "web", "entryType": "CREDIT", "merchantTxRef": "...",
  "timeCreated": "2026-03-08T19:26:34.657Z" }
```

Pagination: `limit` (max 50) + `cursor`; empty `cursor` string = last page.

---

## 9. Webhooks

The authoritative source for final payment/payout status. Configure the webhook
URL in the Nomba dashboard → it POSTs JSON to `POST /api/nomba/webhook`.

> ⚠️ **Webhooks are not part of the OpenAPI spec.** Everything in this section
> (event names, header names, payload shape, and especially the signing-string
> field order in §9.4) is taken from Nomba's prose docs/guides and **must be
> validated against a real sandbox webhook** before trusting the verification
> logic in production.

### 9.1 Event types

| Event | Meaning |
|---|---|
| `payment_success` | Credit received (card, virtual account, pay-by-transfer) |
| `payment_failed` | Inbound payment attempt failed |
| `payment_reversal` | Inbound payment reversed to customer |
| `payout_success` | Debit/transfer completed |
| `payout_failed` | Transfer failed |
| `payout_refund` | Failed transfer refunded back to your account |

### 9.2 Headers

| Header | Value |
|---|---|
| `nomba-signature` | HMAC-SHA256, Base64-encoded |
| `nomba-sig-value` | duplicate of signature |
| `nomba-signature-algorithm` | `HmacSHA256` |
| `nomba-signature-version` | `1.0.0` |
| `nomba-timestamp` | RFC-3339 UTC, e.g. `2026-03-31T05:56:47Z` |

### 9.3 Example payload (payment_success)

```json
{
  "event_type": "payment_success",
  "requestId": "<uuid>",
  "data": {
    "merchant": {},
    "transaction": {
      "id": "...",
      "status": "SUCCESS",
      "amount": 3000,
      "type": "online_checkout",
      "source": "web",
      "merchantTxRef": "...",
      "timeCreated": "2026-03-08T19:26:34.657Z"
    },
    "customer": {}
  }
}
```

### 9.4 Signature verification

Build the signing string by joining these fields with `:` —

```
event_type : requestId : data.userId : data.walletId : data.transactionId : data.type : data.time : data.responseCode : <nomba-timestamp header>
```

Compute `Base64(HMAC_SHA256(signingString, NOMBA_WEBHOOK_SECRET))` and
constant-time compare against the `nomba-signature` header.

```
sig = base64(hmacSha256(
  [event_type, requestId, data.userId, data.walletId, data.transactionId,
   data.type, data.time, data.responseCode, headers["nomba-timestamp"]].join(":"),
  NOMBA_WEBHOOK_SECRET
))
verified = timingSafeEqual(sig, headers["nomba-signature"])
```

### 9.5 Processing rules (per PRD §16)

1. Store the raw payload in `webhook_events` before processing.
2. Verify signature; reject/ignore on mismatch.
3. Idempotency: dedupe on `requestId` (event id) + `transactionId` / `merchantTxRef`.
4. Match to a `payments`/`transfers` row, update status, credit collection/jar.
5. Never double-credit. Failed/reversed payouts restore the source balance.
6. Bot notification failures don't fail the webhook — retry the notification.

Repush from dashboard or `POST /v1/webhooks/re-push` (`hooksRequestId`) /
`POST /v1/webhooks/bulk-re-push`. Nomba auto-retries up to 5 times
(~2m, 5m, 11m, 24m, 53m).

---

## 10. Global Payout (post-MVP)

International payout. Out of Talli MVP scope; documented for later.

> ❌ **Not present in OpenAPI 1.0.0.** Every path/payload below comes from the
> prose docs only and could not be machine-verified. Treat as indicative;
> confirm exact paths and schemas with Nomba before implementing.

| Action | Method + path |
|---|---|
| Fetch exchange rates | `GET /v1/global-payout/exchange-rates?from=EUR&to=USD` |
| Convert money | `POST /v1/global-payout/money/convert` |
| Authorize transfer | `POST /v1/global-payout/transfer/authorize` |
| Authorize exchange | `POST /v1/global-payout/exchange/authorize` |
| Fetch transaction | `GET /v1/global-payout/transactions/{transactionId}` |

Convert body / response:
```json
{ "amount": 15, "currency": "USD", "destinationCurrency": "EUR",
  "transactionType": "EXCHANGE", "sourceCountryIsoCode": "NG" }
```
```json
{ "code": "00", "data": { "fromAmount": 15.0, "toAmount": 13.04, "toCurrency": "EUR",
  "exchangeRateId": "01kkk4b7rh8pcvtw1s1nxs144s", "feeAmount": 0.0 } }
```

Authorize transfer (mobile money example):
```json
{ "amount": 250.0, "sourceCurrency": "USD", "destinationCurrency": "USD",
  "receiverName": "John Cena", "accountNumber": "0903086112",
  "institutionName": "Mpesa", "sourceCountryIsoCode": "CD",
  "destinationCountryIsoCode": "CD", "authCode": "2580",
  "paymentMethod": "MobileMoney", "accountType": "INDIVIDUAL", "narration": "..." }
```
Returns `data.wtTransactionId`, `data.status` (`PROCESSING|COMPLETED|FAILED|PENDING`),
`coreStatus`, `type` (`TRANSFER|EXCHANGE`). Flow: fetch rate → pass
`exchangeRateId` as `lockedExchangeRateId` → authorize.

---

## 11. Talli Nomba SDK (design)

Goal: never write a raw `fetch` to Nomba anywhere in the app. Instead, one small
wrapper does all the talking to Nomba, so the rest of the code just calls
methods like this:

```ts
const { checkoutLink, orderReference } = await nomba.checkout.createOrder({ ... });
const { accountName } = await nomba.transfers.lookupAccount({ accountNumber, bankCode });
await nomba.transfers.toBank({ amount, accountNumber, accountName, bankCode, merchantTxRef });
const banks = await nomba.transfers.listBanks();
const { amount } = await nomba.accounts.getBalance();
const ok = nomba.webhooks.verifySignature(rawBody, headers);
```

### 11.1 Location

`services/engine/src/integrations/nomba/` — this folder only knows how to talk to
Nomba; it has no Talli rules in it. Talli's own rules (checking permissions,
saving to the database, avoiding double-payments) live in a separate
`services/payment.service.ts` later, which *calls* this Nomba wrapper. So the
chain is: route → Talli service → Nomba wrapper.

### 11.2 Folder layout (one small file per concern)

```
integrations/nomba/
  index.ts                 // NombaSdk class + exported `nomba` singleton
  client.ts                // NombaHttpClient: base URL, auth, headers, request(), error mapping
  auth.ts                  // NombaAuth: token issue/refresh/cache (used by client.ts)
  types.ts                 // shared request/response types + NombaEnvelope<T>
  errors.ts                // NombaError (wraps code/description/httpStatus)
  resources/
    checkout.ts            // CheckoutResource
    virtual-accounts.ts    // VirtualAccountResource
    transfers.ts           // TransferResource (banks, lookup, toBank, wallet, requery)
    accounts.ts            // AccountResource (balance)
    transactions.ts        // TransactionResource (list, filter, single)
    global-payout.ts       // GlobalPayoutResource (post-MVP)
    webhooks.ts            // WebhookResource (verifySignature, parseEvent)
```

No file should grow large — each resource class owns ~3-6 methods. If one does,
split by sub-domain.

### 11.3 What each file does

- **`NombaHttpClient`** — the one place that actually sends requests. It picks the
  right base URL (sandbox vs live), adds the auth + `accountId` headers, reads the
  `{ code, description, data }` reply, throws a `NombaError` when `code` isn't
  `"00"`, and retries on `429`/`5xx`. Nothing else makes raw HTTP calls.
- **`NombaAuth`** — gets and remembers the access token. It fetches a token, caches
  it in Redis, and refreshes it shortly before it expires, so callers never deal
  with tokens.
- **Resource files** (checkout, transfers, …) — one file per area. Each just maps
  the endpoints in §4–§10 to simple methods (e.g. `transfers.toBank(...)`) and has
  no Talli rules in it.
- **`NombaSdk`** — wires the above together once and exposes them as `nomba.checkout`,
  `nomba.transfers`, etc:

```ts
class NombaSdk {
  readonly checkout: CheckoutResource;
  readonly virtualAccounts: VirtualAccountResource;
  readonly transfers: TransferResource;
  readonly accounts: AccountResource;
  readonly transactions: TransactionResource;
  readonly globalPayout: GlobalPayoutResource;
  readonly webhooks: WebhookResource;

  constructor() {
    const http = new NombaHttpClient(new NombaAuth());
    this.checkout = new CheckoutResource(http);
    this.transfers = new TransferResource(http);
    // ...etc
  }
}

export const nomba = new NombaSdk();
```

### 11.4 Config (already in `config/env.ts`)

```
NOMBA_ENV=test|live
NOMBA_CLIENT_ID          // client_id
NOMBA_PRIVATE_KEY        // client_secret
NOMBA_PARENT_ACCOUNT_ID  // accountId header
NOMBA_SUB_ACCOUNT_ID     // optional, for sub-account transfers
NOMBA_WEBHOOK_SECRET     // HMAC key for §9.4
```

### 11.5 Conventions

- `.js` import extensions, no inline comments (JSDoc only), `NombaError` extends
  the existing `HttpException` family so `useCatchErrors` maps it cleanly.
- Webhook verification is pure (no network) — easy to unit test.
- The SDK throws on `code !== "00"`; callers/services decide retry vs. surface.

---

## 12. Knowing who paid, in a chat (brainstorm)

Money moves on Nomba's rails; the people live in Telegram/WhatsApp. Nomba only
echoes a reference back on the webhook — it has no concept of "Benaiah in the
football group". So Talli owns the mapping `ref → chat identity` and resolves it
when the webhook lands. Status: design notes, not final.

### 12.1 The mapping

Talli generates a unique ref per payment and stores who/what it belongs to in its
own `payments` row. Nomba returns that ref on the webhook; Talli looks it up.

- Checkout: `order.orderReference` (queryable via `/v1/transactions/accounts/single?orderReference=`).
- Payout: `merchantTxRef` (echoed at `data.meta.merchantTxRef`).

Don't pack identity into the ref string — it's just a key. The row holds the truth:

```ts
// payments row (the cross-reference)
{
  id: "pay_…",
  ref: "talli_col_8af2_mem_19",   // == orderReference / merchantTxRef sent to Nomba
  collectionId: "col_8af2",
  collectionMemberId: "mem_19",
  platform: "telegram",            // telegram | whatsapp
  platformUserId: "555123",        // tg user id, or wa_id
  amount: 3000,
  status: "pending",               // pending → successful | failed
}
```

### 12.2 Identity is per-platform, account is optional

A group payer may never have DM'd Talli, so there may be no `users` row for them —
only their Telegram id + display name from the message. Same human = a TG id in
one chat, a phone number in another. So the stable key is the **platform id**, and
`collection_members` carries both (per PRD):

```ts
collection_member {
  id, collectionId,
  platformUserId,   // telegram from.id  /  whatsapp wa_id   ← stable cross-ref
  displayName,      // from the chat
  appUserId?,       // nullable, linked only if/when they sign up
  expectedAmount, paidAmount, status,
}
```

### 12.3 The trusted identity = the button tap

Telegram authenticates the tapper for us. A tap on an inline button delivers a
`callback_query` whose `from.id` is the real TG user — nothing typed, nothing
spoofable. We resolve the member here, *before* the browser opens, so the Nomba
checkout page never has to self-report who it is.

```ts
// telegram update for a button press
{
  callback_query: {
    id: "1122",
    from: { id: 555123, first_name: "Benaiah", username: "benrobo" },
    message: { chat: { id: -1009876, type: "supergroup" } },
    data: "pay:col_8af2"          // what we set on the button
  }
}
```

### 12.4 Telegram buttons (chosen approach)

Inline keyboard attached to the message — agreed. Two button types cover the flow:
`callback_data` (tap → `callback_query`, no chat spam) and `url` (open the pay
page). Mini Apps (`web_app`) are a later upgrade, not needed for MVP.

```ts
await bot.sendMessage(chatId, "Saturday football — ₦3,000 each. Paid: 0", {
  reply_markup: {
    inline_keyboard: [[{ text: "Pay ₦3,000", callback_data: "pay:col_8af2" }]],
  },
});
```

### 12.5 The flow, with code

```ts
// 1. button tapped → we know the member from from.id (no trust in the browser)
bot.on("callback_query", async (q) => {
  const [, collectionId] = q.data.split(":");            // "pay:col_8af2"

  const member = await collectionService.upsertMember({
    collectionId,
    platform: "telegram",
    platformUserId: String(q.from.id),
    displayName: q.from.first_name,
  });

  // 2. create the Nomba order; ref ties the payment to this member
  const ref = `talli_${collectionId}_${member.id}`;
  const { checkoutLink } = await nomba.checkout.createOrder({
    order: {
      orderReference: ref,
      amount: member.expectedAmount,
      currency: "NGN",
      customerEmail: member.email ?? "noreply@talli.app",
      callbackUrl: `${API_URL}/api/nomba/webhook`,
    },
  });

  await paymentService.create({ ref, collectionId, collectionMemberId: member.id,
    platform: "telegram", platformUserId: String(q.from.id), amount: member.expectedAmount });

  // 3. hand them a per-member link button to pay
  await bot.answerCallbackQuery(q.id, { url: checkoutLink });
});
```

```ts
// 4. webhook lands → match by ref → credit that member → announce
async function onNombaWebhook(event: NombaWebhookEvent) {
  if (event.event_type !== "payment_success") return;
  const ref = event.data.transaction.merchantTxRef;       // == orderReference we sent

  const payment = await paymentService.findByRef(ref);     // the cross-ref row
  if (!payment || payment.status === "successful") return; // idempotent

  await paymentService.markSuccessful(payment.id);
  const progress = await collectionService.creditMember(payment.collectionMemberId, event.data.transaction.amount);

  await bot.sendMessage(progress.chatId,
    `✅ ${progress.memberName} paid ₦${event.data.transaction.amount}. Paid: ${progress.paidCount}`);
}
```

Member is fixed at step 1, so step 4 always credits the right person.

### 12.6 The "everyone" problem (open)

The Bot API can't enumerate a group's members, so "everyone" has no fixed roster
at creation. Two models:

- **Pay-to-enroll** — no roster; `upsertMember` runs on each first tap (the code
  above). Gives "Paid: N", not "N/total".
- **Named list** — admin passes `@tolu @ope @daniel`; members are pre-created, so
  "1/3 paid, waiting on @ope @daniel" works.

Lean: pay-to-enroll for MVP, named list when a real "who hasn't paid" count is
needed. Flagging, not deciding.

### 12.7 WhatsApp

1:1, so identity = sender `wa_id`; no roster. Same `payments` mapping with
`platform: "whatsapp"`. Interactive reply buttons exist, but the pay step is just
a `url` to the hosted checkout.

---

## 13. DM authorization (linking a private chat)

A DM must be tied to a Talli account before the bot does anything. Decisions:

- **Gate up front** — an unlinked DM is blocked at the first message; nothing
  works until the chat is linked.
- **Deep link + code** — dashboard sends the user to
  `t.me/<bot>?start=<code>`; the code arrives as `/start <code>`, no copy-paste.
- **No auto-provisioning** — linking binds the chat to a *real* account created
  via the dashboard (OTP email). No account is invented from the chat identity.

This is the private-chat case of the PRD's chat-verification (§8.2). The group
case (admin verifies a group) is separate; this section is the 1:1 DM.

### 13.1 Data

Reuses the PRD tables. `chat_link_codes` is the short-lived code; `linked_chats`
is the resulting binding.

```ts
chat_link_code {
  id, workspaceId, createdByUserId,
  codeHash,            // store a hash, not the raw code
  purpose: "private_link",
  platform: "telegram",
  expiresAt,           // ~15 min (CHAT_LINK_CODE_TTL_MINUTES)
  usedAt?,             // one-time use
}

linked_chat {
  id, workspaceId,
  platform: "telegram",
  chatType: "private",
  platformChatId,      // the DM chat id
  platformUserId,      // telegram from.id  — the link key
  verifiedByUserId,
  status: "active",
}
```

### 13.2 Generate the code (dashboard)

```ts
// POST /api/workspaces/:workspaceId/link-codes  { platform: "telegram", purpose: "private_link" }
const code = randomLinkCode();                       // e.g. "KOL-9281"
await prisma.chatLinkCode.create({
  data: {
    workspaceId, createdByUserId: userId,
    codeHash: sha256(code), purpose: "private_link", platform: "telegram",
    expiresAt: addMinutes(now, env.CHAT_LINK_CODE_TTL_MINUTES),
  },
});
// dashboard renders a button → https://t.me/<TELEGRAM_BOT_USERNAME>?start=KOL-9281
```

### 13.3 Bot side: link on `/start`, gate everything else

```ts
bot.on("message", async (msg) => {
  const tgUserId = String(msg.from.id);

  // /start <code> → attempt link
  const startCode = msg.text?.match(/^\/start\s+(\S+)/)?.[1];
  if (startCode) return linkPrivateChat(msg, startCode);

  // any other message: require a linked chat first (gate up front)
  const linked = await prisma.linkedChat.findFirst({
    where: { platform: "telegram", platformUserId: tgUserId, status: "active" },
  });
  if (!linked) {
    return bot.sendMessage(msg.chat.id,
      "You need to authorize Talli first 👇", {
        reply_markup: { inline_keyboard: [[
          { text: "Connect Talli", url: `${WEB_APP_URL}/onboarding?connect=telegram` },
        ]]},
      });
  }

  return handleCommand(msg, linked);   // linked → normal flow
});

async function linkPrivateChat(msg, code) {
  const record = await prisma.chatLinkCode.findFirst({
    where: { codeHash: sha256(code), purpose: "private_link", platform: "telegram",
             usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!record) {
    return bot.sendMessage(msg.chat.id, "That code is invalid or expired. Generate a new one in the dashboard.");
  }

  await prisma.$transaction([
    prisma.linkedChat.create({ data: {
      workspaceId: record.workspaceId, platform: "telegram", chatType: "private",
      platformChatId: String(msg.chat.id), platformUserId: String(msg.from.id),
      verifiedByUserId: record.createdByUserId, status: "active",
    }}),
    prisma.chatLinkCode.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return bot.sendMessage(msg.chat.id, "✅ Talli is connected. Try: \"save ₦2,000 to my rent jar\".");
}
```

### 13.4 Rules

- Codes: hashed at rest, one-time (`usedAt`), expire in ~15 min, scoped to
  workspace + platform (PRD §8.2).
- After linking, `linked_chat.platformUserId` is the lookup key for every later
  DM — and the same id used as `payments.platformUserId` in §12.
- `/start` with no/invalid code → show the **Connect Talli** button (deep links
  back to the dashboard, which re-issues a fresh `t.me/...?start=` link).
- WhatsApp: no `/start` deep link — the dashboard shows the code and the user
  sends it as the first message; same `linkPrivateChat` logic keyed on `wa_id`.
