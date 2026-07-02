import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { collectionService } from "../../collection.service.js";
import { payButton, selectCollectionKeyboard } from "../../../integrations/telegram/ui/keyboards.js";

export const listPayableCollectionsTool = defineTool({
  name: "listPayableCollections",
  label: "surface a pay button so people can chip into a collection",
  description:
    "Surface the in-chat pay BUTTON so someone can pay right here with a tap. " +
    "Use when someone wants to pay, contribute, or chip in and will act in this chat. The button is " +
    "attached automatically — just call this and let it appear. " +
    "If instead they ask for a LINK to open or forward (‘send me the link’, ‘share it’), use getCollectionLink. Read-only.",
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const collections = await collectionService.listPayableForChat(ctx.linkedChatId, ctx.userId);
    if (collections.length === 0) {
      return { count: 0 };
    }
    if (collections.length === 1) {
      const c = collections[0]!;
      ctx.emit.keyboard(payButton(c.id, c.amountPerMember ?? 0));
      return { count: 1, collection: { title: c.title, amountPerMember: c.amountPerMember } };
    }
    const items = collections.map((c) => ({
      id: c.id,
      title: c.title,
      amount: c.amountPerMember ?? 0,
      createdAt: c.createdAt,
    }));
    ctx.emit.keyboard(selectCollectionKeyboard(items));
    return { count: items.length, collections: items.map((i) => ({ title: i.title, amount: i.amount })) };
  },
});
