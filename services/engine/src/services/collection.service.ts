import type {
  ChatPlatform,
  Collection,
  CollectionMember,
  CollectionStatus,
  CollectionType,
  Payment,
  Prisma,
} from "@prisma/client";
import prisma from "../prisma/index.js";
import env from "../config/env.js";
import { platformUserService } from "./platform-user.service.js";
import { transferService } from "./transfer.service.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";

export interface CreateCollectionInput {
  title: string;
  purpose: string;
  collectionType: CollectionType;
  amountPerMember?: number;
  targetAmount?: number;
  deadline?: Date;
  linkedChatId?: string;
}

export interface ResolvePayInput {
  memberId?: string;
  payerName?: string;
  amount?: number;
  /** The paying chat identity (e.g. Telegram from.id), stored on the member so
   *  a returning payer keeps one row and can be notified/@-tagged later. */
  platformUserId?: string;
}

export interface UpsertMemberInput {
  collectionId: string;
  platform: ChatPlatform;
  platformUserId: string;
  firstName?: string | null;
  username?: string | null;
}

export interface CollectionWithProgress extends Collection {
  collected: number;
  paidCount: number;
  enrolledCount: number;
}

export type CollectionPayMemberStatus = "available" | "claimed";

export interface PendingPaymentView {
  pendingPaymentId: string;
  amount: number;
  flashAccountNumber: string | null;
  flashBankName: string | null;
  flashAccountName: string | null;
  expiresAt: string | null;
}

export interface CollectionPayMemberView {
  id: string;
  displayName: string;
  expectedAmount: number;
  paidAmount: number;
  status: CollectionPayMemberStatus;
  pendingPayment: PendingPaymentView | null;
  lastFailedAmount: number | null;
}

export interface CollectionPayView {
  title: string;
  purpose: string;
  currency: string;
  collectionType: CollectionType;
  amountPerMember: number | null;
  targetAmount: number | null;
  payTo: string;
  due: string | null;
  members: CollectionPayMemberView[];
}

export interface CreditResult {
  member: CollectionMember;
  collection: Collection;
  paidCount: number;
  memberName: string;
  chatId: string | null;
  collectedTotal: number;
  /**
   * Whether the collection's monetary target has been reached. Only meaningful
   * when `collection.targetAmount` is set — with pay-to-enroll there is no roster
   * and no headcount, so completion can only be judged against a target. Always
   * false for targetless collections (they never auto-complete).
   */
  targetReached: boolean;
}

/**
 * Collections — money a workspace gathers from people, in chat or one-off. Owns
 * creation, membership (named up front or pay-to-enroll on first tap), and
 * crediting members when a payment lands. Crediting is atomic and idempotency is
 * the caller's job (the webhook dedupes before calling `creditMember`).
 */
class CollectionService {
  async create(userId: string, input: CreateCollectionInput): Promise<Collection> {
    if (input.collectionType === "fixed_per_person" && !input.amountPerMember) {
      throw new BadRequestException("amountPerMember is required for a fixed-per-person collection");
    }

    return prisma.collection.create({
      data: {
        ownerUserId: userId,
        linkedChatId: input.linkedChatId,
        title: input.title,
        purpose: input.purpose,
        collectionType: input.collectionType,
        amountPerMember: input.amountPerMember,
        targetAmount: input.targetAmount,
        deadline: input.deadline,
        status: "active",
      },
    });
  }

  /**
   * Lists a workspace's collections with a paid-progress summary on each, so the
   * dashboard listing can show metadata (collected vs target, who's paid, status,
   * deadline) without a follow-up call per row.
   */
  async list(ownerUserId: string): Promise<CollectionWithProgress[]> {
    const collections = await prisma.collection.findMany({
      where: { ownerUserId },
      orderBy: { createdAt: "desc" },
      include: { members: { select: { paidAmount: true, expectedAmount: true, status: true } } },
    });

    return collections.map(({ members, ...collection }) => {
      const collected = members.reduce((sum, m) => sum + m.paidAmount, 0);
      const paidCount = members.filter((m) => m.paidAmount >= m.expectedAmount && m.expectedAmount > 0).length;
      return {
        ...collection,
        collected,
        paidCount,
        enrolledCount: members.length,
      };
    });
  }

  async getPayView(collectionId: string): Promise<CollectionPayView> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        members: { orderBy: { createdAt: "asc" } },
        owner: { select: { name: true, email: true } },
      },
    });
    if (!collection) throw new NotFoundException("Collection not found");
    if (!["active", "partially_paid"].includes(collection.status)) {
      throw new BadRequestException("This collection is not accepting payments");
    }

    const memberIds = collection.members.map((member) => member.id);
    const recentPayments = await prisma.pendingPayment.findMany({
      where: {
        collectionId,
        status: { in: ["pending", "failed", "expired"] },
        collectionMemberId: { in: memberIds },
      },
      orderBy: { createdAt: "desc" },
    });
    const pendingByMember = new Map<string, (typeof recentPayments)[number]>();
    const failedByMember = new Map<string, (typeof recentPayments)[number]>();
    for (const payment of recentPayments) {
      const memberId = payment.collectionMemberId;
      if (!memberId) continue;
      if (payment.status === "pending") {
        if (!pendingByMember.has(memberId)) pendingByMember.set(memberId, payment);
      } else if (!failedByMember.has(memberId)) {
        failedByMember.set(memberId, payment);
      }
    }

    return {
      title: collection.title,
      purpose: collection.purpose,
      currency: collection.currency,
      collectionType: collection.collectionType,
      amountPerMember: collection.amountPerMember,
      targetAmount: collection.targetAmount,
      payTo: collection.owner.name ?? collection.owner.email,
      due: collection.deadline?.toISOString() ?? null,
      members: collection.members.map((member) => {
        const pending = pendingByMember.get(member.id);
        const failed = failedByMember.get(member.id);
        return {
          id: member.id,
          displayName: member.displayName,
          expectedAmount: member.expectedAmount,
          paidAmount: member.paidAmount,
          status:
            collection.collectionType === "open_contribution"
              ? "available"
              : this.isMemberPaid(member)
                ? "claimed"
                : "available",
          pendingPayment: pending
            ? {
                pendingPaymentId: pending.id,
                amount: pending.amount,
                flashAccountNumber: pending.flashAccountNumber,
                flashBankName: pending.flashBankName,
                flashAccountName: pending.flashAccountName,
                expiresAt: pending.expiresAt?.toISOString() ?? null,
              }
            : null,
          lastFailedAmount: !pending && failed ? failed.amount : null,
        };
      }),
    };
  }

  async resolvePayMember(
    collectionId: string,
    input: ResolvePayInput
  ): Promise<CollectionMember> {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: { members: true },
    });
    if (!collection) throw new NotFoundException("Collection not found");
    if (!["active", "partially_paid"].includes(collection.status)) {
      throw new BadRequestException("This collection is not accepting payments");
    }

    return this.resolvePayMemberForCollection(collection, input);
  }

  /**
   * Collections a chat can pay into. Prefers ones bound to THIS chat, but falls
   * back to the account's other active collections when the chat has none of its
   * own — a collection created in the dashboard or another chat is still the same
   * account's, and a member trying to pay in a linked chat should still find it.
   * `ownerUserId` is the account the chat is linked to (LinkedChat.userId).
  */
  async listPayableForChat(linkedChatId: string, ownerUserId?: string): Promise<Collection[]> {
    const active = { in: ["active", "partially_paid"] as CollectionStatus[] };

    const chatBound = await prisma.collection.findMany({
      where: { linkedChatId, status: active },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    if (chatBound.length > 0 || !ownerUserId) return chatBound;

    return prisma.collection.findMany({
      where: { ownerUserId, status: active },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  }

  /**
   * Binds a collection to the group chat a payment is happening in, but only if it
   * isn't already bound — never steals a collection from another chat. This is how
   * a collection created without a chat (dashboard, or an older flow) starts
   * getting its group notified when someone pays in a group. Idempotent no-op if
   * already set or if binding to the same chat.
   */
  async bindToChat(collectionId: string, linkedChatId: string): Promise<void> {
    await prisma.collection.updateMany({
      where: { id: collectionId, linkedChatId: null },
      data: { linkedChatId },
    });
  }

  /**
   * The shareable public link for paying into a collection — the Talli web pay
   * page (`/pay/:id`, keyed by collection id). Same base-URL rule as bill splits.
   * This is what someone forwards so anyone can pay without the in-chat button.
   */
  payLink(collectionId: string): string {
    const base = env.PAYMENT_PAGE_BASE_URL ?? env.WEB_APP_URL;
    return `${base.replace(/\/$/, "")}/pay/${collectionId}`;
  }

  /**
   * Everyone who has actually put money into a collection — name, total paid, and
   * how many times — resolved against the chat identity that paid so a Telegram
   * contributor can be @-tagged. `platformUserId`/`username` are null for web-only
   * payers. Highest contributor first. Used by the "who contributed" chat tool.
   */
  async listContributors(collectionId: string): Promise<
    {
      name: string;
      amount: number;
      count: number;
      platform: ChatPlatform | null;
      platformUserId: string | null;
      username: string | null;
    }[]
  > {
    const members = await prisma.collectionMember.findMany({
      where: { collectionId, paidAmount: { gt: 0 } },
      orderBy: { paidAmount: "desc" },
    });
    if (members.length === 0) return [];

    const counts = await prisma.payment.groupBy({
      by: ["collectionMemberId"],
      where: {
        collectionId,
        kind: "collection_payment",
        status: "successful",
        collectionMemberId: { in: members.map((m) => m.id) },
      },
      _count: { _all: true },
    });
    const countByMember = new Map(counts.map((c) => [c.collectionMemberId, c._count._all]));

    const telegramIds = members.map((m) => m.platformUserId).filter((v): v is string => !!v);
    const identities = telegramIds.length
      ? await prisma.platformUser.findMany({
          where: { platform: "telegram", platformUserId: { in: telegramIds } },
        })
      : [];
    const identityByPlatformId = new Map(identities.map((i) => [i.platformUserId, i]));

    return members.map((m) => {
      const identity = m.platformUserId ? identityByPlatformId.get(m.platformUserId) : undefined;
      return {
        name: m.displayName,
        amount: m.paidAmount,
        count: countByMember.get(m.id) ?? 0,
        platform: identity ? identity.platform : null,
        platformUserId: m.platformUserId,
        username: identity?.username ?? null,
      };
    });
  }

  /** A collection with its members and a paid-progress summary. */
  async getWithProgress(ownerUserId: string, collectionId: string) {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, ownerUserId },
      include: { members: { orderBy: { createdAt: "asc" } } },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    const paidCount = collection.members.filter((m) => m.status === "paid").length;
    const { collected, withdrawn, available } = await this.balanceOf(collectionId);

    return {
      ...collection,
      paidCount,
      totalMembers: collection.members.length,
      collected,
      withdrawn,
      available,
    };
  }

  /**
   * Lists the members enrolled in a collection, paginated and newest-first.
   * Optionally filtered by payment status. Validates the collection belongs to
   * the workspace before reading. Returns the page plus total count so the
   * caller can compute page metadata.
   */
  async listMembers(
    ownerUserId: string,
    collectionId: string,
    options: { page: number; pageSize: number; status?: CollectionMember["status"] }
  ): Promise<{
    members: (CollectionMember & {
      contributionCount: number;
      platform: ChatPlatform | null;
      username: string | null;
    })[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, ownerUserId },
      select: { id: true },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    const page = Math.max(1, options.page);
    const pageSize = Math.min(100, Math.max(1, options.pageSize));
    const where = { collectionId, ...(options.status ? { status: options.status } : {}) };

    const [members, total] = await Promise.all([
      prisma.collectionMember.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.collectionMember.count({ where }),
    ]);

    const counts = await prisma.payment.groupBy({
      by: ["collectionMemberId"],
      where: {
        collectionId,
        kind: "collection_payment",
        status: "successful",
        collectionMemberId: { in: members.map((m) => m.id) },
      },
      _count: { _all: true },
    });
    const countByMember = new Map(counts.map((c) => [c.collectionMemberId, c._count._all]));

    const telegramIds = members.map((m) => m.platformUserId).filter((v): v is string => !!v);
    const identities = telegramIds.length
      ? await prisma.platformUser.findMany({
          where: { platform: "telegram", platformUserId: { in: telegramIds } },
        })
      : [];
    const identityByPlatformId = new Map(identities.map((i) => [i.platformUserId, i]));

    return {
      members: members.map((m) => {
        const identity = m.platformUserId ? identityByPlatformId.get(m.platformUserId) : undefined;
        return {
          ...m,
          contributionCount: countByMember.get(m.id) ?? 0,
          platform: identity ? identity.platform : null,
          username: identity?.username ?? null,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Lists the successful payments made into a collection, paginated and
   * newest-first. Reads the permanent {@link Payment} ledger (the system of
   * record written when a transfer settles), not the in-flight pending rows.
   * Validates the collection belongs to the workspace before reading, and
   * returns the page plus total count for page metadata.
   */
  async listPayments(
    ownerUserId: string,
    collectionId: string,
    options: { page: number; pageSize: number }
  ): Promise<{ payments: Payment[]; total: number; page: number; pageSize: number }> {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, ownerUserId },
      select: { id: true },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    const page = Math.max(1, options.page);
    const pageSize = Math.min(100, Math.max(1, options.pageSize));
    const where = {
      collectionId,
      kind: "collection_payment" as const,
      status: "successful" as const,
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total, page, pageSize };
  }

  /** Updates a collection's status (e.g. close or cancel it). */
  async updateStatus(
    ownerUserId: string,
    collectionId: string,
    status: "draft" | "active" | "closed" | "cancelled"
  ): Promise<Collection> {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, ownerUserId },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    return prisma.collection.update({
      where: { id: collectionId },
      data: { status },
    });
  }

  async update(
    ownerUserId: string,
    collectionId: string,
    input: {
      title: string;
      purpose?: string;
      amountPerMember?: number;
      targetAmount?: number;
      deadline?: Date | null;
    }
  ): Promise<Collection> {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, ownerUserId },
      include: {
        members: { select: { paidAmount: true } },
        payments: {
          where: { kind: "collection_payment", status: "successful" },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    const hasPayments =
      collection.payments.length > 0 || collection.members.some((member) => member.paidAmount > 0);

    const data: Prisma.CollectionUpdateInput = {
      title: input.title,
      purpose: input.purpose ?? "",
    };

    if (input.deadline !== undefined) {
      data.deadline = input.deadline;
    }

    if (!hasPayments) {
      if (
        input.amountPerMember !== undefined &&
        collection.collectionType === "fixed_per_person"
      ) {
        data.amountPerMember = input.amountPerMember;
      }
      if (
        input.targetAmount !== undefined &&
        (collection.collectionType === "open_contribution" ||
          collection.collectionType === "named_members")
      ) {
        data.targetAmount = input.targetAmount;
      }
    }

    return prisma.collection.update({
      where: { id: collectionId },
      data,
    });
  }

  async remove(ownerUserId: string, collectionId: string): Promise<void> {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, ownerUserId },
      select: { id: true },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    const { available } = await this.balanceOf(collectionId);
    if (available > 0) {
      throw new BadRequestException(
        `This collection still holds ₦${available}. Withdraw it first, then delete.`
      );
    }

    await prisma.pendingPayment.deleteMany({ where: { collectionId } });
    await prisma.collection.delete({ where: { id: collectionId } });
  }

  /** Adds a named member up front (for `named_members` collections). */
  async addMember(
    ownerUserId: string,
    collectionId: string,
    input: { displayName: string; expectedAmount: number; platformUserId?: string }
  ): Promise<CollectionMember> {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, ownerUserId },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    return prisma.collectionMember.create({
      data: {
        collectionId,
        displayName: input.displayName,
        platformUserId: input.platformUserId,
        expectedAmount: input.expectedAmount,
      },
    });
  }

  /**
   * Resolves a member from a chat tap, creating them on first sight
   * (pay-to-enroll). The tap is the trusted identity, so we also record the
   * platform user. Expected amount comes from the collection's per-member rule.
   */
  async upsertMember(input: UpsertMemberInput): Promise<CollectionMember> {
    const collection = await prisma.collection.findUnique({
      where: { id: input.collectionId },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    await platformUserService.upsert({
      platform: input.platform,
      platformUserId: input.platformUserId,
      firstName: input.firstName,
      username: input.username,
    });

    const existing = await prisma.collectionMember.findFirst({
      where: { collectionId: input.collectionId, platformUserId: input.platformUserId },
    });
    if (existing) return existing;

    return prisma.collectionMember.create({
      data: {
        collectionId: input.collectionId,
        displayName: input.firstName ?? "Member",
        platformUserId: input.platformUserId,
        expectedAmount: collection.amountPerMember ?? 0,
      },
    });
  }

  async creditMember(
    memberId: string,
    amount: number,
    tx?: Prisma.TransactionClient
  ): Promise<CreditResult> {
    if (tx) return this.creditMemberTx(tx, memberId, amount);
    return prisma.$transaction((client) => this.creditMemberTx(client, memberId, amount));
  }

  private async creditMemberTx(
    tx: Prisma.TransactionClient,
    memberId: string,
    amount: number
  ): Promise<CreditResult> {
    const member = await tx.collectionMember.update({
      where: { id: memberId },
      data: {
        paidAmount: { increment: amount },
        status: "paid",
      },
    });

    const fresh = await tx.collectionMember.findUniqueOrThrow({ where: { id: memberId } });
    const memberStatus = this.memberStatus(fresh.paidAmount, fresh.expectedAmount);
    if (memberStatus !== fresh.status) {
      await tx.collectionMember.update({ where: { id: memberId }, data: { status: memberStatus } });
    }

    const members = await tx.collectionMember.findMany({
      where: { collectionId: member.collectionId },
    });
    const paidCount = members.filter((m) => m.paidAmount >= m.expectedAmount && m.expectedAmount > 0).length;
    const collectedTotal = members.reduce((sum, m) => sum + m.paidAmount, 0);

    const current = await tx.collection.findUniqueOrThrow({ where: { id: member.collectionId } });
    const targetReached = current.targetAmount != null && collectedTotal >= current.targetAmount;

    const collection = await tx.collection.update({
      where: { id: member.collectionId },
      data: { status: targetReached ? "paid" : "partially_paid" },
      include: { linkedChat: { select: { platformChatId: true } } },
    });

    return {
      member: fresh,
      collection,
      paidCount,
      memberName: fresh.displayName,
      chatId: collection.linkedChat?.platformChatId ?? null,
      collectedTotal,
      targetReached,
    };
  }

  private isMemberPaid(member: CollectionMember): boolean {
    if (member.status === "paid") return true;
    return member.expectedAmount > 0 && member.paidAmount >= member.expectedAmount;
  }

  private async resolvePayMemberForCollection(
    collection: Collection & { members: CollectionMember[] },
    input: ResolvePayInput
  ): Promise<CollectionMember> {
    if (collection.collectionType === "open_contribution") {
      return this.resolveOpenContributionMember(collection, input);
    }

    if (input.memberId) {
      const member = collection.members.find((row) => row.id === input.memberId);
      if (!member) throw new NotFoundException("Member not found");
      if (this.isMemberPaid(member)) {
        throw new BadRequestException("This member has already paid");
      }
      return member;
    }

    const payerName = input.payerName?.trim();
    if (!payerName) throw new BadRequestException("Select or enter your name");

    const existing = this.findExistingMember(collection.members, input.platformUserId, payerName);
    if (existing) {
      if (this.isMemberPaid(existing)) {
        throw new BadRequestException("This member has already paid");
      }
      return existing;
    }

    const expectedAmount =
      collection.collectionType === "fixed_per_person"
        ? collection.amountPerMember ?? 0
        : collection.amountPerMember ?? collection.targetAmount ?? 0;
    if (expectedAmount <= 0) {
      throw new BadRequestException("No amount set for this collection yet");
    }

    return prisma.collectionMember.create({
      data: {
        collectionId: collection.id,
        displayName: payerName,
        expectedAmount,
        platformUserId: input.platformUserId,
      },
    });
  }

  /** Finds a returning payer by chat identity (preferred) or by case-insensitive name. */
  private findExistingMember(
    members: CollectionMember[],
    platformUserId: string | undefined,
    payerName: string
  ): CollectionMember | undefined {
    if (platformUserId) {
      const byId = members.find((row) => row.platformUserId === platformUserId);
      if (byId) return byId;
    }
    return members.find((row) => row.displayName.toLowerCase() === payerName.toLowerCase());
  }

  private async resolveOpenContributionMember(
    collection: Collection & { members: CollectionMember[] },
    input: ResolvePayInput
  ): Promise<CollectionMember> {
    const checkoutAmount = input.amount;
    if (!checkoutAmount || checkoutAmount <= 0) {
      throw new BadRequestException("Enter an amount to contribute");
    }

    if (input.memberId) {
      const member = collection.members.find((row) => row.id === input.memberId);
      if (!member) throw new NotFoundException("Member not found");
      if (await this.hasPendingPayment(member.id)) {
        throw new BadRequestException("This member already has a payment in progress");
      }

      return prisma.collectionMember.update({
        where: { id: member.id },
        data: {
          expectedAmount: member.paidAmount + checkoutAmount,
          status: member.paidAmount > 0 ? "underpaid" : "not_paid",
        },
      });
    }

    const payerName = input.payerName?.trim();
    if (!payerName) throw new BadRequestException("Select or enter your name");

    const existing = this.findExistingMember(collection.members, input.platformUserId, payerName);
    if (existing) {
      if (await this.hasPendingPayment(existing.id)) {
        throw new BadRequestException("This member already has a payment in progress");
      }

      return prisma.collectionMember.update({
        where: { id: existing.id },
        data: {
          expectedAmount: existing.paidAmount + checkoutAmount,
          status: existing.paidAmount > 0 ? "underpaid" : "not_paid",
          platformUserId: existing.platformUserId ?? input.platformUserId,
        },
      });
    }

    return prisma.collectionMember.create({
      data: {
        collectionId: collection.id,
        displayName: payerName,
        expectedAmount: checkoutAmount,
        platformUserId: input.platformUserId,
      },
    });
  }

  private async hasPendingPayment(memberId: string): Promise<boolean> {
    const pending = await prisma.pendingPayment.findFirst({
      where: { collectionMemberId: memberId, status: "pending" },
      select: { id: true },
    });
    return pending !== null;
  }

  /**
   * Cancels a member's in-flight collection payment so they can start over. The
   * Nomba order is left to expire on its own (no money has moved); we only flip
   * our reconciliation record to `cancelled` and stop it from blocking a new
   * checkout. Idempotent — a member with nothing pending is a no-op.
   */
  async cancelMemberPending(collectionId: string, memberId: string): Promise<void> {
    const member = await prisma.collectionMember.findFirst({
      where: { id: memberId, collectionId },
      select: { id: true },
    });
    if (!member) throw new NotFoundException("Member not found on this collection");

    await prisma.pendingPayment.updateMany({
      where: { collectionId, collectionMemberId: memberId, status: "pending" },
      data: { status: "cancelled" },
    });
  }

  /**
   * The money position of a collection: `collected` (gross from members, never
   * decreases), `withdrawn` (successful payouts net of refunds), and `available`
   * (what's still in the pot to withdraw). Single source of truth reused by the
   * withdraw check, the detail view, and the delete guard so they never disagree.
   */
  async balanceOf(collectionId: string): Promise<{ collected: number; withdrawn: number; available: number }> {
    const [members, payouts, refunds] = await Promise.all([
      prisma.collectionMember.aggregate({ where: { collectionId }, _sum: { paidAmount: true } }),
      prisma.payment.aggregate({
        where: { collectionId, kind: "transfer_out", direction: "debit", status: "successful" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { collectionId, kind: "refund", direction: "credit", status: "successful" },
        _sum: { amount: true },
      }),
    ]);

    const collected = members._sum.paidAmount ?? 0;
    const withdrawn = (payouts._sum.amount ?? 0) - (refunds._sum.amount ?? 0);
    return { collected, withdrawn, available: Math.max(0, collected - withdrawn) };
  }

  /**
   * How much of a collection is still available to withdraw. Owner-scoped guard,
   * then the shared {@link balanceOf} calculation.
   */
  async availableToWithdraw(userId: string, collectionId: string): Promise<number> {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, ownerUserId: userId },
      select: { id: true },
    });
    if (!collection) throw new NotFoundException("Collection not found");
    const { available } = await this.balanceOf(collectionId);
    return available;
  }

  /**
   * Withdraws collected funds from a collection to a bank account. Owner-only. The
   * amount can't exceed what's available. Funds come from the collection balance, not
   * the owner's wallet, so `payout` records the outflow against the collection and the
   * wallet is never touched. Pending/processing is handled by the transfer reconcile.
   */
  async withdraw(
    userId: string,
    collectionId: string,
    input: { amount: number; accountNumber: string; bankName: string; senderName: string; narration?: string }
  ) {
    const available = await this.availableToWithdraw(userId, collectionId);
    if (input.amount > available) {
      throw new BadRequestException(
        `This collection only has ₦${available} available, can't withdraw ₦${input.amount}.`
      );
    }

    return transferService.payout({
      userId,
      amount: input.amount,
      accountNumber: input.accountNumber,
      bankName: input.bankName,
      senderName: input.senderName,
      narration: input.narration,
      source: { kind: "collection", collectionId },
    });
  }

  private memberStatus(paid: number, expected: number): CollectionMember["status"] {
    if (expected <= 0) return paid > 0 ? "paid" : "not_paid";
    if (paid < expected) return "underpaid";
    if (paid > expected) return "overpaid";
    return "paid";
  }
}

export const collectionService = new CollectionService();
export default collectionService;
