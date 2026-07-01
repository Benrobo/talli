import dayjs from "dayjs";
import type { BillSplit, BillSplitItem, BillSplitSelection, BillSplitSource } from "@prisma/client";
import prisma from "../prisma/index.js";
import env from "../config/env.js";
import { randomToken } from "../lib/utils.js";
import { collectionService } from "./collection.service.js";
import { paymentService } from "./payment.service.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";
import type { ParsedBillItem } from "./bill-parser.service.js";
import type { BillSplitCheckoutInput } from "../schemas/bill-split.schema.js";

const EXPIRY_DAYS = 7;
const TOKEN_PREFIX = "bs_";

export interface CreateBillSplitContext {
  workspaceId: string;
  ownerUserId: string;
  source: BillSplitSource;
  linkedChatId?: string;
  title: string;
  items: ParsedBillItem[];
  total?: number | null;
  knownNames?: string[];
}

export interface BillSplitPublicView {
  title: string;
  status: BillSplit["status"];
  currency: string;
  knownNames: string[];
  items: {
    id: string;
    label: string;
    unitPrice: number;
    status: BillSplitItem["status"];
    paidByName: string | null;
  }[];
  expiresAt: string | null;
}

export interface BillSplitCheckoutResult {
  amount: number;
  flashAccountNumber: string;
  flashBankName: string;
  flashAccountName?: string;
  checkoutUrl: string;
  selectionId: string;
}

class BillSplitService {
  billUrl(token: string): string {
    const base = env.PAYMENT_PAGE_BASE_URL ?? env.WEB_APP_URL;
    return `${base.replace(/\/$/, "")}/bill/${token}`;
  }

  async createFromItems(ctx: CreateBillSplitContext): Promise<{ billSplit: BillSplit; url: string }> {
    if (ctx.items.length === 0) {
      throw new BadRequestException("A bill split needs at least one item from the receipt");
    }

    const subtotal = ctx.items.reduce((sum, item) => sum + item.unitPrice, 0);
    const total = ctx.total ?? subtotal;
    const token = `${TOKEN_PREFIX}${randomToken(16)}`;
    const expiresAt = dayjs().add(EXPIRY_DAYS, "day").toDate();

    const collection = await collectionService.create(ctx.workspaceId, ctx.ownerUserId, {
      title: ctx.title,
      purpose: "bill_split",
      collectionType: "named_members",
      targetAmount: total,
      linkedChatId: ctx.linkedChatId,
    });

    try {
      const billSplit = await prisma.billSplit.create({
        data: {
          workspaceId: ctx.workspaceId,
          linkedChatId: ctx.linkedChatId,
          collectionId: collection.id,
          createdByUserId: ctx.ownerUserId,
          title: ctx.title,
          token,
          source: ctx.source,
          subtotal,
          total,
          knownNames: ctx.knownNames ?? [],
          expiresAt,
          items: {
            create: ctx.items.map((item, index) => ({
              label: item.name,
              unitPrice: item.unitPrice,
              sortOrder: index,
            })),
          },
        },
      });
      return { billSplit, url: this.billUrl(token) };
    } catch (err) {
      await this.discardCollection(collection.id);
      throw err;
    }
  }

  async getByToken(token: string): Promise<BillSplitPublicView> {
    const billSplit = await this.loadActiveByToken(token);
    const items = await prisma.billSplitItem.findMany({
      where: { billSplitId: billSplit.id },
      orderBy: { sortOrder: "asc" },
    });
    return {
      title: billSplit.title,
      status: billSplit.status,
      currency: billSplit.currency,
      knownNames: billSplit.knownNames,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        unitPrice: item.unitPrice,
        status: item.status,
        paidByName: item.paidByName,
      })),
      expiresAt: billSplit.expiresAt?.toISOString() ?? null,
    };
  }

  async checkout(token: string, input: BillSplitCheckoutInput): Promise<BillSplitCheckoutResult> {
    const billSplit = await this.loadActiveByToken(token);
    const items = await prisma.billSplitItem.findMany({ where: { billSplitId: billSplit.id } });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const chosen: BillSplitItem[] = [];
    for (const itemId of input.itemIds) {
      const item = itemMap.get(itemId);
      if (!item) throw new BadRequestException(`Unknown item: ${itemId}`);
      if (item.status === "claimed") {
        throw new BadRequestException(`"${item.label}" was just grabbed by someone else — pick another.`);
      }
      chosen.push(item);
    }
    if (chosen.length === 0) throw new BadRequestException("Pick at least one item to pay for");

    const amount = chosen.reduce((sum, item) => sum + item.unitPrice, 0);
    const payerName = input.payerName.trim();

    const member = await collectionService.addMember(billSplit.workspaceId, billSplit.collectionId, {
      displayName: payerName,
      expectedAmount: amount,
    });

    const pending = await paymentService.create({
      purpose: "collection",
      amount,
      collectionId: billSplit.collectionId,
      collectionMemberId: member.id,
    });

    if (!pending.checkoutLink) {
      throw new BadRequestException("Couldn't generate a pay link for this selection");
    }

    const selection = await prisma.billSplitSelection.create({
      data: {
        billSplitId: billSplit.id,
        collectionMemberId: member.id,
        payerName,
        itemIds: chosen.map((i) => i.id),
        amount,
        checkoutLink: pending.checkoutLink,
        pendingPaymentId: pending.pendingPayment.id,
      },
    });

    if (!billSplit.knownNames.includes(payerName)) {
      await prisma.billSplit.update({
        where: { id: billSplit.id },
        data: { knownNames: { push: payerName } },
      });
    }

    return {
      amount,
      flashAccountNumber: pending.flashAccountNumber,
      flashBankName: pending.flashBankName,
      flashAccountName: pending.flashAccountName,
      checkoutUrl: pending.checkoutLink,
      selectionId: selection.id,
    };
  }

  async settleByPendingPaymentId(pendingPaymentId: string): Promise<{
    billSplit: BillSplit;
    selection: BillSplitSelection;
    items: BillSplitItem[];
  } | null> {
    const selection = await prisma.billSplitSelection.findUnique({
      where: { pendingPaymentId },
    });
    if (!selection || selection.paid) return null;

    return prisma.$transaction(async (tx) => {
      const claim = await tx.billSplitSelection.updateMany({
        where: { id: selection.id, paid: false },
        data: { paid: true },
      });
      if (claim.count === 0) return null;

      const claimed = await tx.billSplitItem.updateMany({
        where: { id: { in: selection.itemIds }, status: "available" },
        data: {
          status: "claimed",
          paidByName: selection.payerName,
          claimedBySelectionId: selection.id,
        },
      });

      const conflicted = claimed.count < selection.itemIds.length;
      if (conflicted) {
        await tx.billSplitSelection.update({
          where: { id: selection.id },
          data: { conflicted: true },
        });
      }

      const billSplit = await tx.billSplit.findUniqueOrThrow({ where: { id: selection.billSplitId } });
      const items = await tx.billSplitItem.findMany({
        where: { claimedBySelectionId: selection.id },
      });
      return { billSplit, selection: { ...selection, paid: true }, items, conflicted };
    });
  }

  async list(workspaceId: string) {
    return prisma.billSplit.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        collection: { select: { status: true, targetAmount: true } },
        _count: { select: { selections: true, items: true } },
      },
    });
  }

  async getProgress(workspaceId: string, billSplitId: string) {
    const billSplit = await prisma.billSplit.findFirst({
      where: { id: billSplitId, workspaceId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        selections: {
          orderBy: { createdAt: "desc" },
          include: {
            collectionMember: {
              select: { status: true, paidAmount: true, expectedAmount: true },
            },
          },
        },
        collection: { select: { targetAmount: true } },
      },
    });
    if (!billSplit) throw new NotFoundException("Bill split not found");

    const collected = billSplit.selections
      .filter((s) => s.paid)
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      billSplit,
      items: billSplit.items,
      selections: billSplit.selections,
      collected,
      targetAmount: billSplit.collection.targetAmount,
    };
  }

  private async discardCollection(collectionId: string): Promise<void> {
    await prisma.collection.delete({ where: { id: collectionId } }).catch(() => {});
  }

  private async loadActiveByToken(token: string) {
    const billSplit = await prisma.billSplit.findUnique({
      where: { token },
      include: { collection: { select: { status: true } } },
    });
    if (!billSplit) throw new NotFoundException("Bill split not found");

    if (billSplit.status !== "active") {
      throw new BadRequestException("This bill split is no longer accepting payments");
    }
    if (billSplit.expiresAt && dayjs().isAfter(billSplit.expiresAt)) {
      await prisma.billSplit.update({ where: { id: billSplit.id }, data: { status: "expired" } });
      throw new BadRequestException("This bill split has expired");
    }
    if (["closed", "cancelled"].includes(billSplit.collection.status)) {
      throw new BadRequestException("This bill split is closed");
    }
    return billSplit;
  }
}

export const billSplitService = new BillSplitService();
export default billSplitService;
