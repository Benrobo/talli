import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { collectionService } from "../../collection.service.js";
import { payButton, selectCollectionKeyboard } from "../../../integrations/telegram/ui/keyboards.js";

export const listPayableCollectionsTool = defineTool({
  name: "listPayableCollections",
  description:
    "Find the collections in this chat that the user can pay into, and surface a pay button. " +
    "Use when someone wants to pay, chip in, or asks 'how do I pay'. The pay UI is attached automatically. Read-only.",
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const collections = await collectionService.listPayableForChat(ctx.linkedChatId);
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
