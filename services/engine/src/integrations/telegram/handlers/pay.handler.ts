import logger from "../../../lib/logger.js";
import { collectionService } from "../../../services/collection.service.js";
import { paymentService } from "../../../services/payment.service.js";
import { messages } from "../ui/messages.js";
import type { TalliContext } from "../types.js";
import { safeReply } from "./shared.js";

/**
 * A "Pay" button tap. The tap is the trusted identity, so we upsert the member
 * from `ctx.from`, open a Nomba checkout, and answer the callback with the pay
 * URL (which opens the hosted page). `arg` is the collection id.
 */
export async function handlePay(ctx: TalliContext, collectionId: string): Promise<void> {
  try {
    const member = await collectionService.upsertMember({
      collectionId,
      platform: "telegram",
      platformUserId: String(ctx.from!.id),
      firstName: ctx.from?.first_name,
      username: ctx.from?.username,
    });

    const { checkoutLink } = await paymentService.startCollectionPayment({
      collectionId,
      memberId: member.id,
      platform: "telegram",
      platformUserId: String(ctx.from!.id),
    });

    await ctx.answerCallbackQuery({ url: checkoutLink });
  } catch (err) {
    logger.error(`[telegram] pay tap failed for collection ${collectionId}: ${(err as Error).message}`);
    await ctx.answerCallbackQuery({ text: "Couldn't start the payment. Please try again." }).catch(() => {});
    await safeReply(ctx, messages.payFailed);
  }
}
