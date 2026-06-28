import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import prisma from "../prisma/index.js";
import { transferService } from "../services/transfer.service.js";
import { workspaceService } from "../services/workspace.service.js";
import type { LookupAccountInput, SendMoneyInput } from "../schemas/transfer.schema.js";

class TransferController {
  private async workspace(ctx: Context): Promise<{ id: string; name: string; ownerUserId: string }> {
    const userId = ctx.get("userId") as string;
    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) throw new BadRequestException("No active workspace");
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, ownerUserId: true },
    });
    if (!workspace) throw new BadRequestException("Workspace not found");
    return workspace;
  }

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

  /** Outbound transfer history for the active workspace — the receipt source. */
  async history(ctx: Context) {
    const workspace = await this.workspace(ctx);
    const transfers = await transferService.history(workspace.id);
    return sendResponse.success(ctx, "Transfers fetched", 200, transfers);
  }

  /** Send money from the workspace wallet to a bank account. */
  async send(ctx: Context) {
    const { accountNumber, bankName, amount, alias, narration } =
      ctx.get("validatedData") as SendMoneyInput;
    const workspace = await this.workspace(ctx);

    const result = await transferService.payout({
      workspaceId: workspace.id,
      ownerUserId: workspace.ownerUserId,
      amount,
      accountNumber,
      bankName,
      alias,
      narration,
      senderName: workspace.name,
    });

    const status = result.status === "sent" ? 200 : 502;
    const message = result.status === "sent" ? "Transfer sent" : "Transfer failed, wallet refunded";
    return sendResponse.success(ctx, message, status, result);
  }
}

export const transferController = new TransferController();
