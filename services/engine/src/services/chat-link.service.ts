import dayjs from "dayjs";
import type { ChatPlatform, ChatLinkPurpose, LinkedChat } from "@prisma/client";
import prisma from "../prisma/index.js";
import env from "../config/env.js";
import { randomLinkCode, sha256 } from "../lib/utils.js";
import { BadRequestException } from "../lib/exception.js";

export interface IssuedLinkCode {
  code: string;
  deepLink: string;
  expiresAt: Date;
}

export interface LinkChatParams {
  platform: ChatPlatform;
  platformChatId: string;
  platformUserId: string;
  title?: string;
}

export type LinkResult =
  | { ok: true; linkedChat: LinkedChat }
  | { ok: false; reason: "invalid_code" };

/**
 * Chat authorization: issue one-time link codes from the dashboard and bind a
 * chat to a workspace when the user redeems one via the bot. Codes are hashed
 * at rest, single-use, and short-lived. See `docs/handoff-v1.md` §13.
 */
class ChatLinkService {
  /** Returns the raw code once (only its hash is stored) plus the deep link. */
  async issueCode(
    workspaceId: string,
    createdByUserId: string,
    platform: ChatPlatform,
    purpose: ChatLinkPurpose
  ): Promise<IssuedLinkCode> {
    const code = randomLinkCode();
    const expiresAt = dayjs().add(env.CHAT_LINK_CODE_TTL_MINUTES, "minute").toDate();

    await prisma.chatLinkCode.create({
      data: {
        workspaceId,
        createdByUserId,
        codeHash: await sha256(code),
        platform,
        purpose,
        expiresAt,
      },
    });

    return { code, deepLink: this.buildDeepLink(platform, code), expiresAt };
  }

  /** Redeems a code and binds the chat; marks the code used so it can't be replayed. */
  async linkChat(code: string, params: LinkChatParams): Promise<LinkResult> {
    const record = await prisma.chatLinkCode.findFirst({
      where: {
        codeHash: await sha256(code),
        platform: params.platform,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) return { ok: false, reason: "invalid_code" };

    const linkedChat = await prisma.$transaction(async (tx) => {
      const chat = await tx.linkedChat.upsert({
        where: {
          platform_platformChatId: {
            platform: params.platform,
            platformChatId: params.platformChatId,
          },
        },
        create: {
          workspaceId: record.workspaceId,
          platform: params.platform,
          chatType: record.purpose === "group_link" ? "group" : "private",
          platformChatId: params.platformChatId,
          platformUserId: params.platformUserId,
          title: params.title,
          verifiedByUserId: record.createdByUserId,
          verifiedAt: new Date(),
          status: "active",
        },
        update: {
          workspaceId: record.workspaceId,
          platformUserId: params.platformUserId,
          title: params.title,
          verifiedByUserId: record.createdByUserId,
          verifiedAt: new Date(),
          status: "active",
        },
      });

      await tx.chatLinkCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      return chat;
    });

    return { ok: true, linkedChat };
  }

  /** Active linked chat for gating, or null if the chat isn't authorized. */
  async findActiveChat(
    platform: ChatPlatform,
    platformChatId: string
  ): Promise<LinkedChat | null> {
    return prisma.linkedChat.findFirst({
      where: { platform, platformChatId, status: "active" },
    });
  }

  private buildDeepLink(platform: ChatPlatform, code: string): string {
    if (platform === "telegram") {
      if (!env.TELEGRAM_BOT_USERNAME) {
        throw new BadRequestException("TELEGRAM_BOT_USERNAME is not configured");
      }
      return `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${code}`;
    }
    return code;
  }
}

export const chatLinkService = new ChatLinkService();
export default chatLinkService;
