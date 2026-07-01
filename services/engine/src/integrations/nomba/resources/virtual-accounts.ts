import type { NombaHttpClient } from "../client.js";

export interface CreateVirtualAccountParams {
  accountRef: string;
  accountName: string;
}

export interface VirtualAccount {
  accountRef: string;
  accountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  currency: string;
  expired: boolean;
  [key: string]: unknown;
}

/**
 * Virtual accounts — a dedicated NUBAN payers can transfer to instead of using
 * the hosted Checkout page. Funds route to the parent account and fire a
 * `payment_success` webhook. See `docs/nomba-api.md` §5.
 */
export class VirtualAccountResource {
  constructor(private readonly http: NombaHttpClient) {}

  async create(params: CreateVirtualAccountParams): Promise<VirtualAccount> {
    return this.http.request<VirtualAccount>({
      method: "POST",
      path: "/v1/accounts/virtual",
      body: params,
    });
  }

  async get(accountRef: string): Promise<VirtualAccount> {
    return this.http.request<VirtualAccount>({
      method: "GET",
      path: `/v1/accounts/virtual/${accountRef}`,
    });
  }

  async expire(accountRef: string): Promise<unknown> {
    return this.http.request({
      method: "DELETE",
      path: `/v1/accounts/virtual/${accountRef}`,
    });
  }
}
