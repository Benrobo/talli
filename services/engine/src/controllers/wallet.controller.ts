import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";
import { walletService } from "../services/wallet.service.js";
import { walletMetricsService } from "../services/wallet-metrics.service.js";
import { workspaceService } from "../services/workspace.service.js";
import type { TopUpInput } from "../schemas/wallet.schema.js";

class WalletController {
  private async workspaceId(ctx: Context): Promise<string> {
    const userId = ctx.get("userId") as string;
    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) throw new BadRequestException("No active workspace");
    return workspaceId;
  }

  async metrics(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const workspaceId = await this.workspaceId(ctx);
    const metrics = await walletMetricsService.get(userId, workspaceId);
    return sendResponse.success(ctx, "Wallet metrics fetched", 200, metrics);
  }

  async balance(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const wallet = await walletService.ensureWallet(userId);
    return sendResponse.success(ctx, "Wallet fetched", 200, {
      balance: wallet.balance,
      currency: wallet.currency,
    });
  }

  async history(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const wallet = await walletService.getByUser(userId);
    if (!wallet) throw new NotFoundException("Wallet not found");
    const transactions = await walletService.history(wallet.id);
    return sendResponse.success(ctx, "History fetched", 200, transactions);
  }

  async topUp(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const { amount } = ctx.get("validatedData") as TopUpInput;
    const result = await walletService.startTopUp(userId, amount);
    return sendResponse.success(ctx, "Top-up started", 201, {
      orderRefId: result.pendingPayment.orderRefId,
      flashAccountNumber: result.flashAccountNumber,
      flashAccountName: result.flashAccountName,
      flashBankName: result.flashBankName,
      amount: result.pendingPayment.amount,
      expiresAt: result.pendingPayment.expiresAt,
    });
  }
}

export const walletController = new WalletController();
