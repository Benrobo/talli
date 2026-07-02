import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { ledgerService } from "../services/ledger.service.js";
import { walletMetricsService } from "../services/wallet-metrics.service.js";
import { paymentService } from "../services/payment.service.js";
import { transferService } from "../services/transfer.service.js";
import type { TopUpInput, WithdrawInput } from "../schemas/wallet.schema.js";
import type { AuthUser } from "../services/auth.service.js";

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

  /** Poll a top-up's status by its orderRefId, driving reconciliation on demand. */
  async verifyTopUp(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const body = (await ctx.req.json().catch(() => ({}))) as { orderRefId?: string };
    if (!body.orderRefId) throw new BadRequestException("orderRefId is required");
    const result = await paymentService.reconcileTopUpOnce(body.orderRefId, userId);
    return sendResponse.success(ctx, "Top-up status fetched", 200, {
      status: result.status,
      amount: result.amount,
    });
  }

  /** Withdraw from the wallet to a bank account (a Nomba payout). */
  async withdraw(ctx: Context) {
    const user = ctx.get("user") as AuthUser;
    const { amount, accountNumber, bankName, narration } = ctx.get("validatedData") as WithdrawInput;

    const result = await transferService.payout({
      userId: user.id,
      amount,
      accountNumber,
      bankName,
      narration,
      senderName: user.name ?? user.email,
    });

    return sendResponse.success(ctx, withdrawMessage(result.status), 200, result);
  }
}

function withdrawMessage(status: "sent" | "pending" | "failed"): string {
  if (status === "sent") return "Withdrawal sent";
  if (status === "pending") return "Withdrawal is processing";
  return "Withdrawal failed, wallet refunded";
}

export const walletController = new WalletController();
