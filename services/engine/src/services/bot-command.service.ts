import dayjs from "dayjs";
import type { BotCommand, ChatPlatform, Prisma } from "@prisma/client";
import prisma from "../prisma/index.js";
import type { Intent } from "../schemas/intent.schema.js";

export interface CommandContext {
  workspaceId: string;
  linkedChatId: string;
  platform: ChatPlatform;
  senderPlatformId: string;
}

const PENDING_TTL_MINUTES = 10;

/**
 * Tracks the one in-flight command per chat. When a parse needs more info we
 * save the partial intent here (status `received`); the user's next message is
 * merged into it and re-evaluated, so a missing amount or recipient can be
 * filled in over a couple of turns instead of starting over.
 */
class BotCommandService {
  async record(ctx: CommandContext, rawText: string, intent: Intent): Promise<BotCommand> {
    return prisma.botCommand.create({
      data: {
        workspaceId: ctx.workspaceId,
        linkedChatId: ctx.linkedChatId,
        platform: ctx.platform,
        senderPlatformId: ctx.senderPlatformId,
        rawText,
        parsedIntent: intent as unknown as Prisma.InputJsonValue,
        status: intent.status === "ready" ? "parsed" : "received",
      },
    });
  }

  /** Records a clarification ask: stores the question's message id + who it's for. */
  async recordClarification(
    ctx: CommandContext,
    rawText: string,
    intent: Intent,
    clarifyMessageId: number | null
  ): Promise<BotCommand> {
    return prisma.botCommand.create({
      data: {
        workspaceId: ctx.workspaceId,
        linkedChatId: ctx.linkedChatId,
        platform: ctx.platform,
        senderPlatformId: ctx.senderPlatformId,
        rawText,
        parsedIntent: intent as unknown as Prisma.InputJsonValue,
        status: "received",
        clarifyMessageId,
        askedBy: ctx.senderPlatformId,
      },
    });
  }

  async get(id: string): Promise<BotCommand | null> {
    return prisma.botCommand.findUnique({ where: { id } });
  }

  /** Records the message id of the force_reply question so a group reply can be matched. */
  async setClarifyMessageId(id: string, clarifyMessageId: number): Promise<void> {
    await prisma.botCommand.update({ where: { id }, data: { clarifyMessageId } });
  }

  /**
   * Finds the pending command this message answers. In a group the message must
   * reply to the bot's question (replyToMessageId == clarifyMessageId) and come
   * from the user it was asked of; in a DM the latest `received` for that sender
   * is the answer. Expired pending commands are ignored.
   */
  async findPendingForReply(
    linkedChatId: string,
    senderPlatformId: string,
    isGroup: boolean,
    replyToMessageId?: number
  ): Promise<BotCommand | null> {
    const fresh = { gt: dayjs().subtract(PENDING_TTL_MINUTES, "minute").toDate() };

    if (isGroup) {
      if (!replyToMessageId) return null;
      return prisma.botCommand.findFirst({
        where: {
          linkedChatId,
          status: "received",
          clarifyMessageId: replyToMessageId,
          askedBy: senderPlatformId,
          updatedAt: fresh,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return prisma.botCommand.findFirst({
      where: { linkedChatId, senderPlatformId, status: "received", updatedAt: fresh },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateIntent(
    id: string,
    intent: Intent,
    clarifyMessageId?: number | null,
    clarifyRounds?: number
  ): Promise<BotCommand> {
    return prisma.botCommand.update({
      where: { id },
      data: {
        parsedIntent: intent as unknown as Prisma.InputJsonValue,
        status: intent.status === "ready" ? "parsed" : "received",
        ...(clarifyMessageId !== undefined ? { clarifyMessageId } : {}),
        ...(clarifyRounds !== undefined ? { clarifyRounds } : {}),
      },
    });
  }

  async setStatus(
    id: string,
    status: "confirmed" | "rejected" | "failed",
    errorMessage?: string
  ): Promise<void> {
    await prisma.botCommand.update({ where: { id }, data: { status, errorMessage } });
  }

  getIntent(command: BotCommand): Intent {
    return command.parsedIntent as unknown as Intent;
  }
}

export const botCommandService = new BotCommandService();
export default botCommandService;
