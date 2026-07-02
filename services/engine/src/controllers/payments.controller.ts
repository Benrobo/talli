import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { transferService } from "../services/transfer.service.js";

class PaymentsController {
  /** Paginated outbound send ledger for the money-sent screen. */
  async list(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const page = Number(ctx.req.query("page") ?? "1");
    const pageSize = Number(ctx.req.query("pageSize") ?? "10");

    const result = await transferService.listSentLedger(userId, {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 10,
    });

    return sendResponse.success(ctx, "Payments fetched", 200, {
      payments: result.payments,
      summary: result.summary,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  }
}

export const paymentsController = new PaymentsController();
