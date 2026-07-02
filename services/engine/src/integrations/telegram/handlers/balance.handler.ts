import { chatLinkService } from "../../../services/chat-link.service.js";
import { balanceService } from "../../../services/balance.service.js";
import { messages } from "../ui/messages.js";
import type { TalliContext } from "../types.js";
import { safeReply, isGroupChat } from "./shared.js";

/** `/balance` — personal wallet, savings, and collections overview. DM-only. */
export async function handleBalance(ctx: TalliContext): Promise<void> {
  if (isGroupChat(ctx)) {
    await safeReply(ctx, messages.balanceDmOnly);
    return;
  }

  const linked = await chatLinkService.findActiveChat("telegram", String(ctx.chat!.id));
  if (!linked) {
    await safeReply(ctx, messages.notLinked);
    return;
  }

  const overview = await balanceService.overview(linked.userId);
  await safeReply(ctx, messages.balance(overview));
}
