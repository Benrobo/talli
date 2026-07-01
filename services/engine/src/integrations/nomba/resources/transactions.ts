import type { NombaHttpClient } from "../client.js";

export interface Transaction {
  id: string;
  status: string;
  amount: number;
  type: string;
  source: string;
  entryType: string;
  merchantTxRef: string;
  timeCreated: string;
  [key: string]: unknown;
}

export interface SingleTransactionQuery {
  transactionRef?: string;
  merchantTxRef?: string;
  orderReference?: string;
  orderId?: string;
  subAccountId?: string;
}

export interface ListTransactionsQuery {
  limit?: number;
  cursor?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransactionPage {
  results: Transaction[];
  cursor?: string;
  [key: string]: unknown;
}

/**
 * Transaction lookup — the spec-verified way to reconcile a payment or payout
 * by reference. Used to confirm webhook events server-side. See §6.5 / §8.
 */
export class TransactionResource {
  constructor(private readonly http: NombaHttpClient) {}

  /** Fetches one transaction by any of its references. Pass exactly one ref. */
  async getSingle(query: SingleTransactionQuery): Promise<Transaction> {
    const { subAccountId, ...refs } = query;
    const path = subAccountId
      ? `/v1/transactions/accounts/${subAccountId}/single`
      : "/v1/transactions/accounts/single";
    return this.http.request<Transaction>({ method: "GET", path, query: refs });
  }

  async requery(sessionId: string): Promise<Transaction> {
    return this.http.request<Transaction>({
      method: "GET",
      path: `/v1/transactions/requery/${sessionId}`,
    });
  }

  async list(query: ListTransactionsQuery = {}): Promise<TransactionPage> {
    return this.http.request<TransactionPage>({
      method: "GET",
      path: "/v1/transactions/accounts",
      query,
    });
  }
}
