# Nomba SDK

A thin, typed client for the [Nomba API](https://developer.nomba.com/docs/).
All Nomba traffic goes through this module — no raw `fetch` calls to Nomba live
anywhere else in the codebase.

The SDK knows only how to talk to Nomba. Business rules (permissions, persistence,
idempotency) belong in the Talli services that call it:

```
route → service → Nomba SDK
```

## Usage

```ts
import { nomba } from "../integrations/nomba/index.js";

const { checkoutLink, orderReference } = await nomba.checkout.createOrder({
  orderReference,
  callbackUrl: `${API_URL}/api/nomba/webhook`,
  customerEmail,
  amount,
});

const { accountName } = await nomba.transfers.lookupAccount({ accountNumber, bankCode });
await nomba.transfers.toBank({ amount, accountNumber, accountName, bankCode, merchantTxRef, senderName });

const banks = await nomba.transfers.listBanks();
const { amount } = await nomba.accounts.getBalance();
const ok = nomba.webhooks.verifySignature(rawBody, headers);
```

## Structure

```
nomba/
  index.ts          NombaSdk + the `nomba` singleton
  client.ts         single HTTP entry point (auth, envelope, retries)
  auth.ts           token issue, caching, refresh
  errors.ts         NombaError (extends HttpException)
  types.ts          shared envelope and types
  resources/        one file per API area — checkout, transfers,
                    accounts, transactions, virtual-accounts, webhooks
```

`auth.ts` issues and caches the access token. `client.ts` is the only file that
sends requests: it resolves the base URL from `NOMBA_ENV`, attaches the token and
`accountId` header, unwraps the `{ code, description, data }` envelope, and throws
on any non-`"00"` response. Resource classes map endpoints to typed methods and
hold no logic of their own.

## Behaviour

- **Errors** surface as `NombaError` (extends `HttpException`, so `useCatchErrors`
  renders them automatically). `err.nombaCode` holds Nomba's business code.
- **Retries** (`async-retry`) cover `429`, `5xx`, and network failures, with a
  single re-auth on `401`. Validation errors fail fast.
- **Idempotency** is the caller's responsibility: pass a unique `merchantTxRef`
  per transfer.
- **Webhook verification** is pure (no network) and easy to test.

## Environments

Credentials are **per-environment** — a test `client_id`/`secret` only issues a
token that works on the sandbox, and live only on production. The SDK keeps both
and picks the right pair from its environment, so a single process can target
either:

```ts
import { nomba, NombaSdk } from "../integrations/nomba/index.js";

nomba                       // follows NOMBA_ENV (the app-wide default)
const live = new NombaSdk("live");   // real NIBSS lookups, real money
```

Tokens are cached per env (`nomba:token:<env>`), so the two never cross.

Sandbox lookups return **mock data** (random account names); real account
holder names only come back from `live`.

## Configuration

Read from `config/env.ts` (Zod-validated) and exposed as the `nombaConfig`
object. `.env` keys:

```
NOMBA_ENV                 test → sandbox.nomba.com, live → api.nomba.com

NOMBA_PARENT_ACCOUNT_ID   accountId header        (shared)
NOMBA_SUB_ACCOUNT_ID      optional sub-account     (shared)
NOMBA_WEBHOOK_SECRET      HMAC key for webhooks    (shared)

NOMBA_TEST_CLIENT_ID      client_id  (sandbox)
NOMBA_TEST_PRIVATE_KEY    client_secret (sandbox)
NOMBA_LIVE_CLIENT_ID      client_id  (production)
NOMBA_LIVE_PRIVATE_KEY    client_secret (production)
```

## Smoke test

`scripts/nomba-smoke.ts` exercises the SDK (balance, banks, lookup) and logs each
response. Verified passing against both envs. The env defaults to `NOMBA_ENV` and
can be overridden per-run without touching `.env`:

```
bun run scripts/nomba-smoke.ts          # uses NOMBA_ENV
bun run scripts/nomba-smoke.ts live     # force production
bun run scripts/nomba-smoke.ts test     # force sandbox
```

Troubleshooting token issue:
- `403 "Forbidden error"` → bad `*_PRIVATE_KEY` (the base64 secret ends in `==`; a
  stray extra `=` produces a 403 indistinguishable from a wrong secret).
- `403 "...your token is a sandbox token"` → a live call is using test creds, or a
  stale cached token; clear `nomba:token:*` in Redis.
- `404 "Client record not found"` → bad `*_CLIENT_ID`.

## Not implemented

Global Payout (post-MVP, absent from the OpenAPI spec). A few endpoints remain
unverified against a live sandbox — checkout refund, the transfer path version,
and the webhook signing-string order — and should be confirmed before relied on.
See [`docs/nomba-api.md`](../../../../../docs/nomba-api.md).
