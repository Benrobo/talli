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
      ? `/v1/transfers/bank/${params.subAccountId}`
      : "/v1/transfers/bank";
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
