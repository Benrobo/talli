import dayjs from "dayjs";
import prisma from "../../prisma/index.js";
import { NotFoundException } from "../../lib/exception.js";
import { renderReceipt, type ReceiptData } from "./renderer.js";

export interface ReceiptListItem {
  reference: string;
  amount: number;
  label: string;
  date: Date;
}

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

  async recentList(workspaceId: string, ownerUserId: string, limit = 8): Promise<ReceiptListItem[]> {
    const wallet = await prisma.wallet.findUnique({ where: { userId: ownerUserId }, select: { id: true } });
    const collections = await prisma.collection.findMany({ where: { workspaceId }, select: { id: true } });
    const collectionIds = collections.map((c) => c.id);

    const transfers = await prisma.transfer.findMany({
      where: { workspaceId, status: "sent" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { merchantTxRef: true, amount: true, accountName: true, createdAt: true },
    });

    const paymentScopes = [
      ...(collectionIds.length ? [{ collectionId: { in: collectionIds } }] : []),
      ...(wallet ? [{ walletId: wallet.id }] : []),
    ];
    const payments = paymentScopes.length
      ? await prisma.pendingPayment.findMany({
          where: { status: "completed", OR: paymentScopes },
          orderBy: { completedAt: "desc" },
          take: limit,
          select: { orderRefId: true, amount: true, purpose: true, collectionId: true, completedAt: true, createdAt: true },
        })
      : [];

    const titles = new Map<string, string>();
    const payCollectionIds = payments.map((p) => p.collectionId).filter((id): id is string => !!id);
    if (payCollectionIds.length) {
      const rows = await prisma.collection.findMany({
        where: { id: { in: payCollectionIds } },
        select: { id: true, title: true },
      });
      rows.forEach((r) => titles.set(r.id, r.title));
    }

    const items: ReceiptListItem[] = [
      ...transfers.map((t) => ({
        reference: t.merchantTxRef,
        amount: t.amount,
        label: `Sent to ${t.accountName}`,
        date: t.createdAt,
      })),
      ...payments.map((p) => ({
        reference: p.orderRefId,
        amount: p.amount,
        label:
          p.purpose === "collection"
            ? (p.collectionId ? titles.get(p.collectionId) ?? "Collection" : "Collection")
            : "Wallet top-up",
        date: p.completedAt ?? p.createdAt,
      })),
    ];

    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
  }

  async latestReference(workspaceId: string, ownerUserId: string): Promise<string | null> {
    const wallet = await prisma.wallet.findUnique({ where: { userId: ownerUserId }, select: { id: true } });
    const collections = await prisma.collection.findMany({ where: { workspaceId }, select: { id: true } });
    const collectionIds = collections.map((c) => c.id);

    const transfer = await prisma.transfer.findFirst({
      where: { workspaceId, status: "sent" },
      orderBy: { createdAt: "desc" },
      select: { merchantTxRef: true, createdAt: true },
    });
    const paymentScopes = [
      ...(collectionIds.length ? [{ collectionId: { in: collectionIds } }] : []),
      ...(wallet ? [{ walletId: wallet.id }] : []),
    ];
    const payment = paymentScopes.length
      ? await prisma.pendingPayment.findFirst({
          where: { status: "completed", OR: paymentScopes },
          orderBy: { completedAt: "desc" },
          select: { orderRefId: true, completedAt: true },
        })
      : null;

    if (!transfer && !payment) return null;
    if (!transfer) return payment!.orderRefId;
    if (!payment) return transfer.merchantTxRef;
    const tDate = transfer.createdAt.getTime();
    const pDate = (payment.completedAt ?? new Date(0)).getTime();
    return tDate >= pDate ? transfer.merchantTxRef : payment.orderRefId;
  }

  async render(data: ReceiptData): Promise<Buffer> {
    return renderReceipt(data);
  }
}

export const receiptService = new ReceiptService();
export type { ReceiptData, ReceiptRow } from "./renderer.js";
export default receiptService;
