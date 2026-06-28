import type {
  ChatPlatform,
  Collection,
  CollectionMember,
  CollectionType,
  Prisma,
} from "@prisma/client";
import prisma from "../prisma/index.js";
import { platformUserService } from "./platform-user.service.js";
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

export interface UpsertMemberInput {
  collectionId: string;
  platform: ChatPlatform;
  platformUserId: string;
  firstName?: string | null;
  username?: string | null;
}

export interface CreditResult {
  member: CollectionMember;
  collection: Collection;
  paidCount: number;
  memberName: string;
  chatId: string | null;
}

/**
 * Collections — money a workspace gathers from people, in chat or one-off. Owns
 * creation, membership (named up front or pay-to-enroll on first tap), and
 * crediting members when a payment lands. Crediting is atomic and idempotency is
 * the caller's job (the webhook dedupes before calling `creditMember`).
 */
class CollectionService {
  async create(
    workspaceId: string,
    userId: string,
    input: CreateCollectionInput
  ): Promise<Collection> {
    if (input.collectionType === "fixed_per_person" && !input.amountPerMember) {
      throw new BadRequestException("amountPerMember is required for a fixed-per-person collection");
    }

    return prisma.collection.create({
      data: {
        workspaceId,
        createdByUserId: userId,
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

  async list(workspaceId: string): Promise<Collection[]> {
    return prisma.collection.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** A collection with its members and a paid-progress summary. */
  async getWithProgress(workspaceId: string, collectionId: string) {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, workspaceId },
      include: { members: { orderBy: { createdAt: "asc" } } },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    const paidCount = collection.members.filter((m) => m.status === "paid").length;
    const collected = collection.members.reduce((sum, m) => sum + m.paidAmount, 0);

    return { ...collection, paidCount, totalMembers: collection.members.length, collected };
  }

  /** Updates a collection's status (e.g. close or cancel it). */
  async updateStatus(
    workspaceId: string,
    collectionId: string,
    status: "active" | "closed" | "cancelled"
  ): Promise<Collection> {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, workspaceId },
    });
    if (!collection) throw new NotFoundException("Collection not found");

    return prisma.collection.update({
      where: { id: collectionId },
      data: { status },
    });
  }

  /** Adds a named member up front (for `named_members` collections). */
  async addMember(
    workspaceId: string,
    collectionId: string,
    input: { displayName: string; expectedAmount: number; platformUserId?: string }
  ): Promise<CollectionMember> {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, workspaceId },
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

  /**
   * Credits a member by `amount` and rolls up member + collection status. Atomic.
   * Returns progress for a chat announcement. The caller must ensure this runs
   * once per payment (the webhook dedupes on the event id first).
   */
  async creditMember(memberId: string, amount: number): Promise<CreditResult> {
    return prisma.$transaction(async (tx) => {
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
      const allPaid = members.length > 0 && paidCount === members.length;

      const collection = await tx.collection.update({
        where: { id: member.collectionId },
        data: { status: allPaid ? "paid" : "partially_paid" },
        include: { linkedChat: { select: { platformChatId: true } } },
      });

      return {
        member: fresh,
        collection,
        paidCount,
        memberName: fresh.displayName,
        chatId: collection.linkedChat?.platformChatId ?? null,
      };
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
