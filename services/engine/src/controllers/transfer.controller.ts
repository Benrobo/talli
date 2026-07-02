import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { transferService } from "../services/transfer.service.js";
import type { LookupAccountInput, SendMoneyInput } from "../schemas/transfer.schema.js";

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
}

class TransferController {
  /** Bank list, optionally filtered by `?q=` (name or code). */
  async banks(ctx: Context) {
    const q = ctx.req.query("q")?.trim().toLowerCase();
    const banks = await transferService.listBanks();
    const filtered = q
      ? banks.filter((b) => b.name.toLowerCase().includes(q) || b.code.includes(q))
      : banks;
    return sendResponse.success(ctx, "Banks fetched", 200, filtered);
  }

  /** Verify an account number + bank, returning the real account-holder name. */
  async lookup(ctx: Context) {
    const { accountNumber, bankName } = ctx.get("validatedData") as LookupAccountInput;
    const verified = await transferService.verifyDestination(accountNumber, bankName);
    if (!verified.ok) {
      throw new BadRequestException(
        verified.reason === "bank_unknown"
          ? `Couldn't find a bank matching "${bankName}".`
          : `Couldn't verify ${accountNumber} at ${bankName}.`
      );
    }
    return sendResponse.success(ctx, "Account verified", 200, {
      accountName: verified.accountName,
      accountNumber: verified.accountNumber,
      bankName: verified.bankName,
      bankCode: verified.bankCode,
    });
  }

  /** Outbound transfer history for the authenticated user — the receipt source. */
  async history(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const transfers = await transferService.history(userId);
    return sendResponse.success(ctx, "Transfers fetched", 200, transfers);
  }

  /** Send money from the user's wallet to a bank account. */
  async send(ctx: Context) {
    const { accountNumber, bankName, amount, alias, narration } =
      ctx.get("validatedData") as SendMoneyInput;
    const user = ctx.get("user") as AuthUser;

    const result = await transferService.payout({
      userId: user.id,
      amount,
      accountNumber,
      bankName,
      alias,
      narration,
      senderName: user.name ?? user.email,
    });

    const status = result.status === "sent" ? 200 : 502;
    const message = result.status === "sent" ? "Transfer sent" : "Transfer failed, wallet refunded";
    return sendResponse.success(ctx, message, status, result);
  }
}

export const transferController = new TransferController();
