import type { Context } from "hono";
import type { PaymentStatus } from "@prisma/client";
import sendResponse from "../lib/send-response.js";
import { ledgerService } from "../services/ledger.service.js";
import { transferService } from "../services/transfer.service.js";

const STATUSES: PaymentStatus[] = ["pending", "successful", "failed", "cancelled"];

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

class TransactionsController {
  async list(ctx: Context) {
    const userId = ctx.get("userId") as string;
    const q = ctx.req.query();

    const page = Number(q.page ?? "1");
    const pageSize = Number(q.pageSize ?? "20");
    const status = STATUSES.includes(q.status as PaymentStatus)
      ? (q.status as PaymentStatus)
      : undefined;

    const dateFrom = parseDate(q.dateFrom);
    const dateTo = parseDate(q.dateTo);

    const [{ items, total, page: p, pageSize: ps }, summary, counts] = await Promise.all([
      ledgerService.listHistory(userId, {
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 20,
        type: q.type,
        status,
        dateFrom,
        dateTo,
        search: q.search,
      }),
      ledgerService.summary(userId, { dateFrom, dateTo }),
      ledgerService.counts(userId, { status, dateFrom, dateTo, search: q.search }),
    ]);

    const transferRefs = items
      .filter((row) => row.kind === "transfer_out" && row.referenceId)
      .map((row) => row.referenceId as string);
    const transferDetails = await transferService.detailsByRefs(transferRefs);

    return sendResponse.success(ctx, "Transactions fetched", 200, {
      transactions: items.map((row) => {
        const details = row.kind === "transfer_out" && row.referenceId ? transferDetails[row.referenceId] : undefined;
        return {
          id: row.id,
          direction: row.direction,
          kind: row.kind,
          amount: row.amount,
          currency: row.currency,
          status: row.status,
          reference: row.referenceId ?? row.providerReference ?? row.providerOrderId ?? row.id,
          savingsJarId: row.savingsJarId,
          collectionId: row.collectionId,
          transferId: row.transferId,
          recipient: details
            ? {
                accountName: details.accountName,
                accountNumber: details.accountNumber,
                bankName: details.bankName,
              }
            : null,
          narration: details?.narration ?? null,
          createdAt: row.createdAt,
          paidAt: row.paidAt,
        };
      }),
      summary,
      counts,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.max(1, Math.ceil(total / ps)),
      },
    });
  }
}

export const transactionsController = new TransactionsController();
