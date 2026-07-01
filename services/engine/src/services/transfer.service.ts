import { randomToken } from "../lib/utils.js";
import { nomba } from "../integrations/nomba/index.js";
import type { Bank } from "../integrations/nomba/resources/transfers.js";
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

  /**
   * Matches a free-text bank name ("zenith", "gtb") to a Nomba bank. Prefers an
   * exact name, then a name starting with the term, then any name containing it —
   * so "zenith" picks "Zenith Bank" over "Zenith Eazy Wallet". Returns null when
   * nothing matches.
   */
  async resolveBank(name: string): Promise<Bank | null> {
    const term = name.trim().toLowerCase();
    if (!term) return null;
    const banks = await nomba.transfers.listBanks();

    return (
      banks.find((b) => b.name.toLowerCase() === term) ??
      banks.find((b) => b.name.toLowerCase().startsWith(term)) ??
      banks.find((b) => b.name.toLowerCase().includes(term)) ??
      null
    );
  }

  /**
   * Verifies a destination the user typed (account number + a bank name) against
   * Nomba: resolves the bank, then looks up the real account-holder name. Returns
   * the verified details to show on the confirm card, or a reason it failed so
   * the dispatcher can ask again. Never throws for the expected failures.
   */
  async verifyDestination(
    accountNumber: string,
    bankName: string
  ): Promise<
    | { ok: true; accountName: string; accountNumber: string; bankCode: string; bankName: string }
    | { ok: false; reason: "bank_unknown" | "account_unverified" }
  > {
    const bank = await this.resolveBank(bankName);
    if (!bank) return { ok: false, reason: "bank_unknown" };

    try {
      const { accountName } = await nomba.transfers.lookupAccount({
        accountNumber,
        bankCode: bank.code,
      });
      if (!accountName) return { ok: false, reason: "account_unverified" };
      return { ok: true, accountName, accountNumber, bankCode: bank.code, bankName: bank.name };
    } catch {
      return { ok: false, reason: "account_unverified" };
    }
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
