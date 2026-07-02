import type { NombaHttpClient } from "../client.js";
import type { TransferStatus } from "../types.js";

export interface Bank {
  code: string;
  name: string;
  nipCode?: string | null;
  logo?: string | null;
}

export interface BankLookupParams {
  accountNumber: string;
  bankCode: string;
}

export interface BankLookupResult {
  accountNumber: string;
  accountName: string;
}

export interface TransferToBankParams {
  amount: number;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  merchantTxRef: string;
  senderName: string;
  narration?: string;
  subAccountId?: string;
}

export interface TransferResult {
  id: string;
  status: TransferStatus;
  type: string;
  amount: number;
  fee: number;
  timeCreated: string;
  meta: {
    merchantTxRef: string;
    rrn: string;
    [key: string]: unknown;
  };
}

export interface WalletTransferParams {
  amount: number;
  receiverAccountId: string;
  merchantTxRef: string;
  narration?: string;
  subAccountId?: string;
}

/**
 * Nigeria payout — bank codes, name lookup, transfer-to-bank, and Nomba-to-Nomba
 * wallet transfer. Always lookup the recipient name and confirm with the user
 * before transferring (parse-and-confirm). `merchantTxRef` is the idempotency
 * key — never reuse it for a new attempt. See `docs/nomba-api.md` §6.
 */
export class TransferResource {
  constructor(private readonly http: NombaHttpClient) {}

  async listBanks(): Promise<Bank[]> {
    return this.http.request<Bank[]>({
      method: "GET",
      path: "/v1/transfers/banks",
    });
  }

  async lookupAccount(params: BankLookupParams): Promise<BankLookupResult> {
    return this.http.request<BankLookupResult>({
      method: "POST",
      path: "/v1/transfers/bank/lookup",
      body: params,
    });
  }

  async toBank(params: TransferToBankParams): Promise<TransferResult> {
    const path = params.subAccountId
      ? `/v2/transfers/bank/${params.subAccountId}`
      : "/v2/transfers/bank";
    return this.http.request<TransferResult>({
      method: "POST",
      path,
      body: {
        amount: params.amount,
        accountNumber: params.accountNumber,
        accountName: params.accountName,
        bankCode: params.bankCode,
        merchantTxRef: params.merchantTxRef,
        senderName: params.senderName,
        narration: params.narration,
      },
      // An accepted transfer can come back "PROCESSING" (code 200/201, not "00"). That is
      // NOT an error — the money is in flight and the body carries data.id/data.status we
      // need to reconcile. Treat those codes as success so we don't lose the id.
      acceptCodes: ["200", "201"],
    });
  }

  /**
   * Requery a transfer's final outcome by its merchant ref (the parent-account
   * endpoint). Use to poll a PENDING_BILLING / NEW / 201 transfer until it
   * settles to SUCCESS or REFUND, since the initial response is not authoritative.
   */
  async requery(transactionRef: string): Promise<TransferResult> {
    return this.http.request<TransferResult>({
      method: "GET",
      path: `/v1/transactions/accounts/single?transactionRef=${encodeURIComponent(transactionRef)}`,
    });
  }

  async toWallet(params: WalletTransferParams): Promise<TransferResult> {
    const path = params.subAccountId
      ? `/v1/transfers/wallet/${params.subAccountId}`
      : "/v1/transfers/wallet";
    return this.http.request<TransferResult>({
      method: "POST",
      path,
      body: {
        amount: params.amount,
        receiverAccountId: params.receiverAccountId,
        merchantTxRef: params.merchantTxRef,
        narration: params.narration,
      },
    });
  }
}
