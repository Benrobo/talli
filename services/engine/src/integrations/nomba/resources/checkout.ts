import type { NombaHttpClient } from "../client.js";

export interface CheckoutSplitEntry {
  accountId: string;
  value: number;
}

export interface CreateCheckoutOrderParams {
  orderReference: string;
  callbackUrl: string;
  customerEmail: string;
  amount: number;
  currency?: "NGN";
  customerId?: string;
  accountId?: string;
  splitRequest?: {
    splitType: "PERCENTAGE" | "FLAT";
    splitList: CheckoutSplitEntry[];
  };
}

export interface CreateCheckoutOrderResult {
  checkoutLink: string;
  orderReference: string;
}

export type CheckoutIdType = "ORDER_ID" | "ORDER_REFERENCE";

export interface CheckoutTransaction {
  status: string;
  amount: number;
  [key: string]: unknown;
}

export interface CancelCheckoutParams {
  transactionId: string;
  forceCancel?: boolean;
}

export interface FlashAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

export interface CheckoutReceipt {
  status: boolean;
  message?: string;
  order?: {
    orderId?: string;
    orderReference: string;
    amount: number;
    currency?: string;
    [key: string]: unknown;
  };
}

/**
 * Hosted Checkout — create an order, fetch a per-order flash account number for
 * pay-by-transfer, and poll the transaction's status. Talli v2 funds wallets and
 * collections this way (flash account + polling, not virtual accounts/webhooks).
 */
export class CheckoutResource {
  constructor(private readonly http: NombaHttpClient) {}

  /** Creates a checkout order. `currency` defaults to NGN (spec-only enum). */
  async createOrder(params: CreateCheckoutOrderParams): Promise<CreateCheckoutOrderResult> {
    return this.http.request<CreateCheckoutOrderResult>({
      method: "POST",
      path: "/v1/checkout/order",
      body: {
        order: {
          orderReference: params.orderReference,
          callbackUrl: params.callbackUrl,
          customerEmail: params.customerEmail,
          amount: params.amount,
          currency: params.currency ?? "NGN",
          customerId: params.customerId,
          accountId: params.accountId,
          splitRequest: params.splitRequest,
        },
        tokenizeCard: false,
      },
    });
  }

  /** Verifies a checkout transaction server-side. Never trust the front-end redirect. */
  async getTransaction(idType: CheckoutIdType, id: string): Promise<CheckoutTransaction> {
    return this.http.request<CheckoutTransaction>({
      method: "GET",
      path: "/v1/checkout/transaction",
      query: { idType, id },
    });
  }

  /** Cancels a pending checkout transaction. Keys on `transactionId`, not the order ref. */
  async cancelTransaction(params: CancelCheckoutParams): Promise<unknown> {
    return this.http.request({
      method: "POST",
      path: "/v1/checkout/transaction/cancel",
      body: {
        transactionId: params.transactionId,
        forceCancel: params.forceCancel ?? false,
      },
    });
  }

  /** Fetches the per-order flash account number the payer transfers to. */
  async getFlashAccount(orderReference: string): Promise<FlashAccount> {
    return this.http.request<FlashAccount>({
      method: "GET",
      path: `/v1/checkout/get-checkout-kta/${orderReference}`,
    });
  }

  /** Polls a checkout order's status. `status: true` means the transfer landed. */
  async confirmReceipt(orderReference: string): Promise<CheckoutReceipt> {
    return this.http.request<CheckoutReceipt>({
      method: "POST",
      path: "/v1/checkout/confirm-transaction-receipt",
      body: { orderReference },
    });
  }
}
