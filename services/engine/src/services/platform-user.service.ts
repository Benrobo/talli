import type { ChatPlatform, PlatformUser } from "@prisma/client";
import prisma from "../prisma/index.js";

export interface PlatformUserInput {
  platform: ChatPlatform;
  platformUserId: string;
  firstName?: string | null;
  username?: string | null;
}

/**
 * Records chat-platform identities (Telegram user id / WhatsApp wa_id). Only
 * touched when a user commits an action — connecting a chat, paying, etc. We
 * upsert on first sight and refresh on each later action, so any flow can look a
 * person up by (platform, platformUserId) without copying their name around.
 */
class PlatformUserService {
  async upsert(input: PlatformUserInput): Promise<PlatformUser> {
    return prisma.platformUser.upsert({
      where: {
        platform_platformUserId: {
          platform: input.platform,
          platformUserId: input.platformUserId,
        },
      },
      create: {
        platform: input.platform,
        platformUserId: input.platformUserId,
        firstName: input.firstName ?? null,
        username: input.username ?? null,
      },
      update: {
        firstName: input.firstName ?? undefined,
        username: input.username ?? undefined,
      },
    });
  }

  formatName(user: Pick<PlatformUser, "firstName" | "username"> | null): string {
    if (!user) return "someone";
    const handle = user.username ? `@${user.username}` : null;
    if (user.firstName && handle) return `${user.firstName} (${handle})`;
    return user.firstName ?? handle ?? "someone";
  }
}

export const platformUserService = new PlatformUserService();
export default platformUserService;
