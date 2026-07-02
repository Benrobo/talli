import dayjs from "dayjs";
import type { BotCommand, ChatPlatform, Prisma } from "@prisma/client";
import prisma from "../prisma/index.js";
import type { Intent } from "../schemas/intent.schema.js";

export interface CommandContext {
  userId: string;
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
  async record(
    ctx: CommandContext,
    rawText: string,
    intent: Intent,
    replyText?: string
  ): Promise<BotCommand> {
    return prisma.botCommand.create({
      data: {
        userId: ctx.userId,
        linkedChatId: ctx.linkedChatId,
        platform: ctx.platform,
        senderPlatformId: ctx.senderPlatformId,
        rawText,
        replyText,
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
    clarifyMessageId: number | null,
    replyText?: string
  ): Promise<BotCommand> {
    return prisma.botCommand.create({
      data: {
        userId: ctx.userId,
        linkedChatId: ctx.linkedChatId,
        platform: ctx.platform,
        senderPlatformId: ctx.senderPlatformId,
        rawText,
        replyText,
        parsedIntent: intent as unknown as Prisma.InputJsonValue,
        status: "received",
        clarifyMessageId,
        askedBy: ctx.senderPlatformId,
      },
    });
  }

  /**
   * Records a conversational turn that isn't a pending action — a greeting, an
   * acknowledgment, a status read, or an "unknown" — together with Talli's reply,
   * so the transcript stays complete for later context. Status is terminal here.
   */
  async recordConversational(
    ctx: CommandContext,
    rawText: string,
    intent: Intent,
    replyText: string
  ): Promise<BotCommand> {
    return prisma.botCommand.create({
      data: {
        userId: ctx.userId,
        linkedChatId: ctx.linkedChatId,
        platform: ctx.platform,
        senderPlatformId: ctx.senderPlatformId,
        rawText,
        replyText,
        parsedIntent: intent as unknown as Prisma.InputJsonValue,
        status: "confirmed",
      },
    });
  }

  async get(id: string): Promise<BotCommand | null> {
    return prisma.botCommand.findUnique({ where: { id } });
  }

  /**
   * The recent back-and-forth in a chat (oldest-first) as a real transcript — what
   * the user said and how Talli replied — for the parser to read the room and
   * resolve short follow-ups ("ok", "do it again"). Uses stored reply text, not
   * internal intent/status, so the model sees a conversation, not our schema.
   * Read-only context: it must never re-trigger a past action on its own.
   */
  async recentHistory(linkedChatId: string, senderPlatformId: string, limit = 3): Promise<string[]> {
    const rows = await prisma.botCommand.findMany({
      where: { linkedChatId, senderPlatformId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { rawText: true, replyText: true },
    });
    return rows.reverse().flatMap((r) => {
      const turn = [`User: ${r.rawText}`];
      if (r.replyText) turn.push(`Talli: ${this.oneLine(r.replyText)}`);
      return turn;
    });
  }

  /** Collapses a multi-line bot reply to a single transcript line. */
  private oneLine(text: string): string {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > 160 ? `${flat.slice(0, 157)}...` : flat;
  }

  /** Records the message id of the force_reply question so a group reply can be matched. */
  async setClarifyMessageId(id: string, clarifyMessageId: number): Promise<void> {
    await prisma.botCommand.update({ where: { id }, data: { clarifyMessageId } });
  }

  /** Stores Talli's reply text on a command so the transcript stays complete. */
  async setReplyText(id: string, replyText: string): Promise<void> {
    await prisma.botCommand.update({ where: { id }, data: { replyText } });
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
