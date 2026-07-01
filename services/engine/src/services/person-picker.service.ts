import dayjs from "dayjs";
import type { PersonPicker, PersonPickerItem, PersonPickerSelection } from "@prisma/client";
import prisma from "../prisma/index.js";
import env from "../config/env.js";
import { randomToken } from "../lib/utils.js";
import { collectionService } from "./collection.service.js";
import { paymentService } from "./payment.service.js";
import {
  BadRequestException,
  NotFoundException,
} from "../lib/exception.js";
import type { ParsedBillItem } from "./bill-parser.service.js";
import type { PickerCheckoutInput } from "../schemas/person-picker.schema.js";

const PICKER_EXPIRY_DAYS = 7;
const TOKEN_PREFIX = "pk_";

export interface CreatePersonPickerContext {
  workspaceId: string;
  ownerUserId: string;
  linkedChatId: string;
  title: string;
  items: ParsedBillItem[];
  total?: number | null;
}

export interface PersonPickerPublicView {
  title: string;
  status: PersonPicker["status"];
  currency: string;
  items: { id: string; label: string; unitPrice: number; maxQuantity: number }[];
  expiresAt: string | null;
}

export interface PersonPickerCheckoutResult {
  amount: number;
  checkoutLink: string;
  selectionId: string;
}

export interface PersonPickerProgress {
  picker: PersonPicker;
  items: PersonPickerItem[];
  selections: (PersonPickerSelection & {
    collectionMember: { status: string; paidAmount: number; expectedAmount: number };
  })[];
  collected: number;
  targetAmount: number | null;
}

/**
 * Receipt-driven person picker — each payer selects item quantities on a web page,
 * checkout computes their share server-side, and the existing collection payment
 * loop reconciles via Nomba.
 */
class PersonPickerService {
  pickerUrl(token: string): string {
    const base = env.PAYMENT_PAGE_BASE_URL ?? env.WEB_APP_URL;
    return `${base.replace(/\/$/, "")}/picker/${token}`;
  }

  async createFromItems(ctx: CreatePersonPickerContext): Promise<{ picker: PersonPicker; url: string }> {
    if (ctx.items.length === 0) {
      throw new BadRequestException("A person picker needs at least one item from the receipt");
    }

    const subtotal = ctx.items.reduce(
      (sum, item) => sum + item.unitPrice * (item.quantity ?? 1),
      0
    );
    const total = ctx.total ?? subtotal;
    const token = `${TOKEN_PREFIX}${randomToken(16)}`;
    const expiresAt = dayjs().add(PICKER_EXPIRY_DAYS, "day").toDate();

    const collection = await collectionService.create(ctx.workspaceId, ctx.ownerUserId, {
      title: ctx.title,
      purpose: "person_picker",
      collectionType: "named_members",
      targetAmount: total,
      linkedChatId: ctx.linkedChatId,
    });

    try {
      const picker = await prisma.personPicker.create({
        data: {
          workspaceId: ctx.workspaceId,
          linkedChatId: ctx.linkedChatId,
          collectionId: collection.id,
          createdByUserId: ctx.ownerUserId,
          title: ctx.title,
          token,
          subtotal,
          total,
          expiresAt,
          items: {
            create: ctx.items.map((item, index) => ({
              label: item.name,
              unitPrice: item.unitPrice,
              maxQuantity: Math.max(item.quantity ?? 99, 99),
              sortOrder: index,
            })),
          },
        },
      });
      return { picker, url: this.pickerUrl(token) };
    } catch (err) {
      await prisma.collection.delete({ where: { id: collection.id } }).catch(() => {});
      throw err;
    }
  }

  async getByToken(token: string): Promise<PersonPickerPublicView> {
    const picker = await this.loadActivePickerByToken(token);
    const items = await prisma.personPickerItem.findMany({
      where: { pickerId: picker.id },
      orderBy: { sortOrder: "asc" },
    });
    return {
      title: picker.title,
      status: picker.status,
      currency: picker.currency,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        unitPrice: item.unitPrice,
        maxQuantity: item.maxQuantity,
      })),
      expiresAt: picker.expiresAt?.toISOString() ?? null,
    };
  }

  async checkout(token: string, input: PickerCheckoutInput): Promise<PersonPickerCheckoutResult> {
    const picker = await this.loadActivePickerByToken(token);
    const items = await prisma.personPickerItem.findMany({ where: { pickerId: picker.id } });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    let amount = 0;
    const normalized: { itemId: string; quantity: number }[] = [];

    for (const row of input.selections) {
      if (row.quantity <= 0) continue;
      const item = itemMap.get(row.itemId);
      if (!item) throw new BadRequestException(`Unknown item: ${row.itemId}`);
      if (row.quantity > item.maxQuantity) {
        throw new BadRequestException(`Quantity for ${item.label} cannot exceed ${item.maxQuantity}`);
      }
      amount += item.unitPrice * row.quantity;
      normalized.push({ itemId: row.itemId, quantity: row.quantity });
    }

    if (amount <= 0) throw new BadRequestException("Your selection total must be greater than zero");

    const member = await collectionService.addMember(picker.workspaceId, picker.collectionId, {
      displayName: input.payerName,
      expectedAmount: amount,
    });

    const pending = await paymentService.create({
      purpose: "collection",
      amount,
      collectionId: picker.collectionId,
      collectionMemberId: member.id,
    });

    if (!pending.checkoutLink) {
      throw new BadRequestException("Couldn't generate a pay link for this selection");
    }

    const selection = await prisma.personPickerSelection.create({
      data: {
        pickerId: picker.id,
        collectionMemberId: member.id,
        payerName: input.payerName,
        selections: normalized,
        amount,
        checkoutLink: pending.checkoutLink,
        pendingPaymentId: pending.pendingPayment.id,
      },
    });

    return {
      amount,
      checkoutLink: pending.checkoutLink,
      selectionId: selection.id,
    };
  }

  async list(workspaceId: string) {
    return prisma.personPicker.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        collection: { select: { status: true, targetAmount: true } },
        _count: { select: { selections: true, items: true } },
      },
    });
  }

  async getProgress(workspaceId: string, pickerId: string): Promise<PersonPickerProgress> {
    const picker = await prisma.personPicker.findFirst({
      where: { id: pickerId, workspaceId },
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
    if (!picker) throw new NotFoundException("Person picker not found");

    const collected = picker.selections.reduce(
      (sum, s) => sum + s.collectionMember.paidAmount,
      0
    );

    return {
      picker,
      items: picker.items,
      selections: picker.selections,
      collected,
      targetAmount: picker.collection.targetAmount,
    };
  }

  private async loadActivePickerByToken(token: string) {
    const picker = await prisma.personPicker.findUnique({
      where: { token },
      include: { collection: { select: { status: true } } },
    });
    if (!picker) throw new NotFoundException("Picker not found");

    if (picker.status !== "active") {
      throw new BadRequestException("This picker is no longer accepting selections");
    }
    if (picker.expiresAt && dayjs().isAfter(picker.expiresAt)) {
      await prisma.personPicker.update({
        where: { id: picker.id },
        data: { status: "expired" },
      });
      throw new BadRequestException("This picker has expired");
    }
    if (["closed", "cancelled"].includes(picker.collection.status)) {
      throw new BadRequestException("This picker is closed");
    }
    return picker;
  }
}

export const personPickerService = new PersonPickerService();
export default personPickerService;
