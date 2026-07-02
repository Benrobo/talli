import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { ledgerService } from "../services/ledger.service.js";
import { walletMetricsService } from "../services/wallet-metrics.service.js";
import { paymentService } from "../services/payment.service.js";
import type { TopUpInput } from "../schemas/wallet.schema.js";

class WalletController {
  async metrics(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const metrics = await walletMetricsService.get(userId);
    return sendResponse.success(ctx, "Wallet metrics fetched", 200, metrics);
  }

  async balance(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const balance = await ledgerService.getBalance(userId);
    return sendResponse.success(ctx, "Wallet fetched", 200, {
      balance,
      currency: "NGN",
    });
  }

  async history(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const transactions = await ledgerService.history(userId);
    return sendResponse.success(ctx, "History fetched", 200, transactions);
  }

  async topUp(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const { amount } = ctx.get("validatedData") as TopUpInput;
    const result = await paymentService.createTopUp(userId, amount);
    return sendResponse.success(ctx, "Top-up started", 201, {
      orderRefId: result.pendingPayment.orderRefId,
      virtualAccountNumber: result.virtualAccountNumber,
      accountName: result.accountName,
      bankName: result.bankName,
      flashAccountNumber: result.virtualAccountNumber,
      flashAccountName: result.accountName,
      flashBankName: result.bankName,
      amount: result.pendingPayment.amount,
      expiresAt: result.pendingPayment.expiresAt,
    });
  }
}

export const walletController = new WalletController();
