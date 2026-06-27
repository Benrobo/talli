import { nombaConfig } from "../../config/env.js";
import { NombaHttpClient } from "./client.js";
import { CheckoutResource } from "./resources/checkout.js";
import { VirtualAccountResource } from "./resources/virtual-accounts.js";
import { TransferResource } from "./resources/transfers.js";
import { AccountResource } from "./resources/accounts.js";
import { TransactionResource } from "./resources/transactions.js";
import { WebhookResource } from "./resources/webhooks.js";
import type { NombaEnv } from "./types.js";

/**
 * The one wrapper around the Nomba API.
 * Use the exported `nomba` singleton: `nomba.checkout.createOrder(...)`,
 * `nomba.transfers.toBank(...)`, etc. Pass an explicit env to target a
 * specific environment regardless of `NOMBA_ENV` (e.g. a live lookup from a
 * script); the default follows `NOMBA_ENV`.
 */
export class NombaSdk {
  readonly checkout: CheckoutResource;
  readonly virtualAccounts: VirtualAccountResource;
  readonly transfers: TransferResource;
  readonly accounts: AccountResource;
  readonly transactions: TransactionResource;
  readonly webhooks: WebhookResource;

  constructor(nombaEnv: NombaEnv = nombaConfig.env) {
    const http = new NombaHttpClient(nombaEnv);
    this.checkout = new CheckoutResource(http);
    this.virtualAccounts = new VirtualAccountResource(http);
    this.transfers = new TransferResource(http);
    this.accounts = new AccountResource(http);
    this.transactions = new TransactionResource(http);
    this.webhooks = new WebhookResource();
  }
}

export const nomba = new NombaSdk();
export default nomba;

export { NombaError } from "./errors.js";
export type {
  NombaEnv,
  NombaEnvelope,
  TransferStatus,
  NombaWebhookEventType,
} from "./types.js";
export type { NombaWebhookEvent } from "./resources/webhooks.js";
