import env from "../../../config/env.js";
import { chatLinkService } from "../../../services/chat-link.service.js";
import { messages } from "../ui/messages.js";
import { infoActions } from "../ui/keyboards.js";
import type { TalliContext } from "../types.js";
import { safeReplyWithPhoto, isGroupChat } from "./shared.js";

/** `/info` — Talli banner with status + commands as the caption, plus an action keyboard. */
export async function handleInfo(ctx: TalliContext): Promise<void> {
  const status = await chatLinkService.getChatStatus("telegram", String(ctx.chat!.id));
  const chatLabel = isGroupChat(ctx) ? "this group" : "this chat";

  await safeReplyWithPhoto(
    ctx,
    env.TELEGRAM_INFO_BANNER_URL,
    messages.info({ chatLabel, ...status }),
    infoActions(env.WEB_APP_URL, status.connected)
  );
}
