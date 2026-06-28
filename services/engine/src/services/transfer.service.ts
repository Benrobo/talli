import { randomToken } from "../lib/utils.js";
import { nomba } from "../integrations/nomba/index.js";
import { beneficiaryService } from "./beneficiary.service.js";
import { NotFoundException } from "../lib/exception.js";

export interface ResolveRecipientResult {
  found: boolean;
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
}

export interface SendToBankInput {
  workspaceId: string;
  amount: number;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  senderName: string;
  alias?: string;
  bankName?: string;
  createdByPlatformUserId?: string;
  narration?: string;
}

/**
 * Send Mode — bank transfers over the Nomba SDK, parse-and-confirm. Resolves a
 * recipient from the phone book (or a fresh bank lookup), executes the transfer,
 * and saves the recipient for next time. Only ever called from a private DM; the
 * dispatcher enforces that.
 */
class TransferService {
  /** Resolves a chat alias to verified account details via the phone book. */
  async resolveRecipient(workspaceId: string, alias: string): Promise<ResolveRecipientResult> {
    const saved = await beneficiaryService.findByAlias(workspaceId, alias);
    if (!saved) return { found: false };
    return {
      found: true,
      accountName: saved.accountName,
      accountNumber: saved.accountNumber,
      bankCode: saved.bankCode,
      bankName: saved.bankName ?? undefined,
    };
  }

  /** Verifies fresh account details against Nomba before they're shown/saved. */
  async lookupAccount(accountNumber: string, bankCode: string): Promise<string> {
    const { accountName } = await nomba.transfers.lookupAccount({ accountNumber, bankCode });
    if (!accountName) throw new NotFoundException("Could not verify that account");
    return accountName;
  }

  async listBanks() {
    return nomba.transfers.listBanks();
  }

  /** Executes the transfer and records the recipient in the phone book. */
  async sendToBank(input: SendToBankInput) {
    const merchantTxRef = `talli_xfer_${randomToken(8)}`;
    const result = await nomba.transfers.toBank({
      amount: input.amount,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      bankCode: input.bankCode,
      senderName: input.senderName,
      merchantTxRef,
      narration: input.narration,
    });

    if (input.alias) {
      await beneficiaryService.save({
        workspaceId: input.workspaceId,
        alias: input.alias,
        accountName: input.accountName,
        accountNumber: input.accountNumber,
        bankCode: input.bankCode,
        bankName: input.bankName,
        createdByPlatformUserId: input.createdByPlatformUserId,
      });
    }

    return { merchantTxRef, status: result.status, transferId: result.id };
  }
}

export const transferService = new TransferService();
export default transferService;
