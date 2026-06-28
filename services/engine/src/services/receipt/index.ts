import dayjs from "dayjs";
import prisma from "../../prisma/index.js";
import { NotFoundException } from "../../lib/exception.js";
import { renderReceipt, type ReceiptData } from "./renderer.js";

function money(amount: number): string {
  return amount.toLocaleString("en-NG");
}

function when(date: Date): string {
  return dayjs(date).format("DD MMM YYYY, h:mm A");
}

class ReceiptService {
  async buildByReference(reference: string, workspaceId?: string): Promise<ReceiptData> {
    const transfer = await prisma.transfer.findUnique({ where: { merchantTxRef: reference } });
    if (transfer && (!workspaceId || transfer.workspaceId === workspaceId)) {
      return {
        amount: money(transfer.amount),
        purpose: "Money sent",
        highlight: transfer.bankName ?? "Bank transfer",
        rows: [
          { icon: "from", label: "From", value: transfer.senderName ?? "Talli Wallet" },
          { icon: "to", label: "To", value: transfer.accountName },
          { icon: "date", label: "Date", value: when(transfer.createdAt) },
          { icon: "ref", label: "Reference", value: transfer.merchantTxRef, mono: true },
        ],
      };
    }

    const pending = await prisma.pendingPayment.findUnique({ where: { orderRefId: reference } });
    if (pending) {
      if (pending.purpose === "collection" && pending.collectionMemberId) {
        const member = await prisma.collectionMember.findUnique({
          where: { id: pending.collectionMemberId },
          include: { collection: { select: { title: true } } },
        });
        return {
          amount: money(pending.amount),
          purpose: "Collection payment",
          highlight: member?.collection.title ?? "Collection",
          rows: [
            { icon: "from", label: "From", value: member?.displayName ?? "Member" },
            { icon: "to", label: "To", value: member?.collection.title ?? "Collection" },
            { icon: "date", label: "Date", value: when(pending.completedAt ?? pending.createdAt) },
            { icon: "ref", label: "Reference", value: pending.orderRefId, mono: true },
          ],
        };
      }
      return {
        amount: money(pending.amount),
        purpose: "Wallet top-up",
        highlight: "Talli Wallet",
        rows: [
          { icon: "from", label: "Method", value: "Bank transfer" },
          { icon: "to", label: "To", value: "Talli Wallet" },
          { icon: "date", label: "Date", value: when(pending.completedAt ?? pending.createdAt) },
          { icon: "ref", label: "Reference", value: pending.orderRefId, mono: true },
        ],
      };
    }

    throw new NotFoundException("Receipt not found");
  }

  async renderByReference(reference: string, workspaceId?: string): Promise<Buffer> {
    const data = await this.buildByReference(reference, workspaceId);
    return renderReceipt(data);
  }

  async render(data: ReceiptData): Promise<Buffer> {
    return renderReceipt(data);
  }
}

export const receiptService = new ReceiptService();
export type { ReceiptData, ReceiptRow } from "./renderer.js";
export default receiptService;
