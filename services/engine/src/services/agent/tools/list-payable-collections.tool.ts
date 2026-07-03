import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { collectionService } from "../../collection.service.js";
import { collectionPayKeyboard, selectCollectionKeyboard } from "../../../integrations/telegram/ui/keyboards.js";

const FIXED_LINK_INFO =
  "For this fixed collection, add a short note that paying with the in-chat button keeps it tied to them, " +
  "while paying by the link means you can only show the name they type — not that it's them from this group.";

export const listPayableCollectionsTool = defineTool({
  name: "listPayableCollections",
  label: "surface a way to pay into a collection (button or link)",
  description:
    "Surface how to pay into a collection when someone wants to pay, contribute, or chip in. " +
    "The right UI is attached automatically — just call this. A FIXED collection gets an in-chat Pay button " +
    "(and a secondary pay-by-link button); an OPEN pot / fundraiser gets a link to pay on the web (anyone can " +
    "pay, even outside this chat). Read what it returns and phrase the reply: for a fixed one include the info " +
    "note about identity; for an open one just point them at the link. Read-only.",
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const collections = await collectionService.listPayableForChat(ctx.linkedChatId, ctx.userId);
    if (collections.length === 0) {
      return { count: 0 };
    }
    if (collections.length === 1) {
      const c = collections[0]!;
      const isOpen = c.amountPerMember == null || c.amountPerMember <= 0;
      const payLink = collectionService.payLink(c.id);
      const keyboard = collectionPayKeyboard(c, payLink);
      if (keyboard) ctx.emit.keyboard(keyboard);
      return {
        count: 1,
        collection: {
          title: c.title,
          amountPerMember: c.amountPerMember,
          mode: isOpen ? "open" : "fixed",
          payLink,
        },
        instruction: isOpen
          ? "Point them at the link to pay on the web — anyone can chip in, no need to be in this chat."
          : FIXED_LINK_INFO,
      };
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
