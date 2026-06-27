import type { NombaHttpClient } from "../client.js";

export interface AccountBalance {
  amount: string;
  currency: string;
  timeCreated: string;
}

/**
 * Account balance for the parent or a sub-account. Talli checks available
 * balance before allowing a payout or withdrawal. See `docs/nomba-api.md` §7.
 */
export class AccountResource {
  constructor(private readonly http: NombaHttpClient) {}

  async getBalance(subAccountId?: string): Promise<AccountBalance> {
    const path = subAccountId
      ? `/v1/accounts/${subAccountId}/balance`
      : "/v1/accounts/balance";
    return this.http.request<AccountBalance>({ method: "GET", path });
  }
}
