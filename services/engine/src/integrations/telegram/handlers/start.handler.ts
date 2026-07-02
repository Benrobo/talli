import env from "../../../config/env.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { messages } from "../ui/messages.js";
import { connectTalli } from "../ui/keyboards.js";
import type { TalliContext } from "../types.js";
import { safeReply, isGroupChat, isSenderAdmin } from "./shared.js";

/**
 * `/start` command. In a DM it links the private chat (or shows the welcome when
 * no code is given). In a group it links the whole group, but only if the sender
 * is a group admin — otherwise anyone could bind someone else's group.
 */
export async function handleStart(ctx: TalliContext): Promise<void> {
  const code = ctx.match?.toString().trim();
  const inGroup = isGroupChat(ctx);
  const isAdmin = await isSenderAdmin(ctx);

  if (inGroup && !isAdmin) {
    await safeReply(ctx, messages.groupAdminOnly);
    return;
  }

  if (!code) {
    await safeReply(
      ctx,
      inGroup ? messages.groupNeedsCode : messages.startNoCode,
      inGroup ? undefined : connectTalli(env.WEB_APP_URL)
    );
    return;
  }

  const result = await chatLinkService.linkChat(code, {
    platform: "telegram",
    platformChatId: String(ctx.chat!.id),
    platformUserId: String(ctx.from?.id ?? ctx.chat!.id),
    chatType: inGroup ? "group" : "private",
    title: inGroup ? ctx.chat!.title : ctx.from?.first_name,
    connector: { firstName: ctx.from?.first_name, username: ctx.from?.username },
  });

  if (!result.ok) {
    if (result.reason === "already_linked") {
      await safeReply(ctx, messages.alreadyLinked(result.accountName));
    } else if (result.reason === "purpose_mismatch") {
      await safeReply(ctx, messages.wrongCodeType(result.expected));
    } else {
      await safeReply(ctx, messages.invalidCode);
    }
    return;
  }

  const { accountName, connectedBy } = result.info;
  await safeReply(
    ctx,
    inGroup
      ? messages.groupLinked(accountName, connectedBy)
      : messages.linked(accountName, connectedBy)
  );
}
