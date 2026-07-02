import dayjs from "dayjs";
import type { ChatPlatform, ChatLinkPurpose, LinkedChat } from "@prisma/client";
import prisma from "../prisma/index.js";
import env from "../config/env.js";
import { randomLinkCode, sha256 } from "../lib/utils.js";
import { BadRequestException, NotFoundException } from "../lib/exception.js";
import { platformUserService } from "./platform-user.service.js";

export interface IssuedLinkCode {
  code: string;
  expiresAt: Date;
  /** How to redeem the code, ready to show the user. */
  instructions: string;
  /**
   * Tap-to-open link that starts a DM with the bot. Only present for
   * `private_link` — group linking has no deep link (Telegram can't deep-link
   * into a group), so use `command` there.
   */
  deepLink?: string;
  /** Copy-paste command a group admin posts in the group. Only for `group_link`. */
  command?: string;
}

export interface LinkChatParams {
  platform: ChatPlatform;
  platformChatId: string;
  platformUserId: string;
  /** The actual type of the chat the code is being redeemed in. */
  chatType: "group" | "private";
  title?: string;
  /** The connector's platform identity (whoever ran the link command). */
  connector?: { firstName?: string | null; username?: string | null };
}

export interface LinkedChatInfo {
  accountName: string;
  connectedBy: string;
}

export type LinkResult =
  | { ok: true; linkedChat: LinkedChat; info: LinkedChatInfo }
  | { ok: false; reason: "invalid_code" }
  | { ok: false; reason: "purpose_mismatch"; expected: "group" | "private" }
  | { ok: false; reason: "already_linked"; accountName: string };

export interface ConnectedChatView {
  id: string;
  platform: ChatPlatform;
  chatType: string;
  title: string | null;
  status: string;
  connectedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

/**
 * Chat authorization: issue one-time link codes from the dashboard and bind a
 * chat to a user account when the user redeems one via the bot. Codes are hashed
 * at rest, single-use, and short-lived. See `docs/handoff-v1.md` §13.
 */
class ChatLinkService {
  /**
   * Issues a one-time code (only its hash is stored). Private links get a
   * tap-to-open deep link; group links get a copy-paste command, since Telegram
   * can't deep-link into a group.
   */
  async issueCode(
    createdByUserId: string,
    platform: ChatPlatform,
    purpose: ChatLinkPurpose
  ): Promise<IssuedLinkCode> {
    const code = randomLinkCode();
    const expiresAt = dayjs().add(env.CHAT_LINK_CODE_TTL_MINUTES, "minute").toDate();

    await prisma.chatLinkCode.create({
      data: {
        createdByUserId,
        codeHash: await sha256(code),
        platform,
        purpose,
        expiresAt,
      },
    });

    if (purpose === "group_link") {
      const command = `/start ${code}`;
      return {
        code,
        expiresAt,
        command,
        instructions: `Add the bot to your group, then post this command there (as a group admin): ${command}`,
      };
    }

    const deepLink = this.buildDeepLink(platform, code);
    return {
      code,
      expiresAt,
      deepLink,
      instructions: `Open this link to connect your chat: ${deepLink}`,
    };
  }

  /**
   * Redeems a code and binds the chat, marking the code used so it can't be
   * replayed. Rejects if the chat is already connected — it must be disconnected
   * first, so a stray code can't silently move a chat to another account.
   */
  async linkChat(code: string, params: LinkChatParams): Promise<LinkResult> {
    const existing = await prisma.linkedChat.findUnique({
      where: {
        platform_platformChatId: {
          platform: params.platform,
          platformChatId: params.platformChatId,
        },
      },
      include: { user: { select: { name: true, email: true } } },
    });
    if (existing && existing.status === "active") {
      return {
        ok: false,
        reason: "already_linked",
        accountName: this.ownerLabel(existing.user),
      };
    }

    const record = await prisma.chatLinkCode.findFirst({
      where: {
        codeHash: await sha256(code),
        platform: params.platform,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) return { ok: false, reason: "invalid_code" };

    const expectedChatType = record.purpose === "group_link" ? "group" : "private";
    if (params.chatType !== expectedChatType) {
      return { ok: false, reason: "purpose_mismatch", expected: expectedChatType };
    }

    const connectorIdentity = await platformUserService.upsert({
      platform: params.platform,
      platformUserId: params.platformUserId,
      firstName: params.connector?.firstName,
      username: params.connector?.username,
    });

    const linkedChat = await prisma.$transaction(async (tx) => {
      const chat = await tx.linkedChat.upsert({
        where: {
          platform_platformChatId: {
            platform: params.platform,
            platformChatId: params.platformChatId,
          },
        },
        create: {
          userId: record.createdByUserId,
          platform: params.platform,
          chatType: expectedChatType,
          platformChatId: params.platformChatId,
          platformUserId: params.platformUserId,
          title: params.title,
          connectedByPlatformUserId: connectorIdentity.id,
          verifiedByUserId: record.createdByUserId,
          verifiedAt: new Date(),
          status: "active",
        },
        update: {
          userId: record.createdByUserId,
          platformUserId: params.platformUserId,
          title: params.title,
          connectedByPlatformUserId: connectorIdentity.id,
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

    const owner = await prisma.user.findUnique({
      where: { id: record.createdByUserId },
      select: { name: true, email: true },
    });

    return {
      ok: true,
      linkedChat,
      info: {
        accountName: this.ownerLabel(owner),
        connectedBy: platformUserService.formatName(connectorIdentity),
      },
    };
  }

  /** Lists the chats connected to a user's account, newest first, for the dashboard. */
  async listConnectedChats(userId: string): Promise<ConnectedChatView[]> {
    const chats = await prisma.linkedChat.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { connectedBy: { select: { firstName: true, username: true } } },
    });

    return chats.map((chat) => ({
      id: chat.id,
      platform: chat.platform,
      chatType: chat.chatType,
      title: chat.title,
      status: chat.status,
      connectedBy: chat.connectedBy ? platformUserService.formatName(chat.connectedBy) : null,
      verifiedAt: chat.verifiedAt,
      createdAt: chat.createdAt,
    }));
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

  /** Connection details for a chat (owner, connector), used by `/info`. */
  async getChatStatus(
    platform: ChatPlatform,
    platformChatId: string
  ): Promise<{ connected: boolean; accountName?: string; connectedBy?: string }> {
    const chat = await prisma.linkedChat.findFirst({
      where: { platform, platformChatId, status: "active" },
      include: {
        user: { select: { name: true, email: true } },
        connectedBy: { select: { firstName: true, username: true } },
      },
    });
    if (!chat) return { connected: false };

    return {
      connected: true,
      accountName: this.ownerLabel(chat.user),
      connectedBy: platformUserService.formatName(chat.connectedBy),
    };
  }

  /**
   * Disconnects a chat from the bot side, keyed on chat identity. Returns false
   * if the chat wasn't connected. Used by the in-chat `/disconnect` command.
   */
  async disconnectByChat(platform: ChatPlatform, platformChatId: string): Promise<boolean> {
    const result = await prisma.linkedChat.updateMany({
      where: { platform, platformChatId, status: "active" },
      data: { status: "disabled" },
    });
    return result.count > 0;
  }

  /**
   * Disconnects a connected chat by id, scoped to the user so a user can only
   * unlink their own account's chats. Used by the dashboard endpoint.
   */
  async disconnectById(userId: string, linkedChatId: string): Promise<void> {
    const chat = await prisma.linkedChat.findFirst({
      where: { id: linkedChatId, userId },
    });
    if (!chat) throw new NotFoundException("Connected chat not found");

    await prisma.linkedChat.update({
      where: { id: linkedChatId },
      data: { status: "disabled" },
    });
  }

  private ownerLabel(user: { name: string | null; email: string } | null): string {
    return user?.name ?? user?.email ?? "your account";
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
