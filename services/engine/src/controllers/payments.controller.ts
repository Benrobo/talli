import type { Context } from "hono";
import sendResponse from "../lib/send-response.js";
import { BadRequestException } from "../lib/exception.js";
import { transferService } from "../services/transfer.service.js";
import { workspaceService } from "../services/workspace.service.js";

class PaymentsController {
  private async workspaceId(ctx: Context): Promise<string> {
    const userId = ctx.get("userId") as string;
    const workspaceId = await workspaceService.getActiveWorkspaceId(userId);
    if (!workspaceId) throw new BadRequestException("No active workspace");
    return workspaceId;
  }

  /** Paginated outbound send ledger for the money-sent screen. */
  async list(ctx: Context) {
    const workspaceId = await this.workspaceId(ctx);
    const page = Number(ctx.req.query("page") ?? "1");
    const pageSize = Number(ctx.req.query("pageSize") ?? "10");

    const result = await transferService.listSentLedger(workspaceId, {
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
