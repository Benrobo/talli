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
    title: inGroup ? ctx.chat!.title : ctx.from?.first_name,
    connector: { firstName: ctx.from?.first_name, username: ctx.from?.username },
  });

  if (!result.ok) {
    await safeReply(
      ctx,
      result.reason === "already_linked"
        ? messages.alreadyLinked(result.workspaceName)
        : messages.invalidCode
    );
    return;
  }

  const { workspaceName, connectedBy } = result.info;
  await safeReply(
    ctx,
    inGroup
      ? messages.groupLinked(workspaceName, connectedBy)
      : messages.linked(workspaceName, connectedBy)
  );
}
