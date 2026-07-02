import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { collectionService } from "../../collection.service.js";

export const getCollectionLinkTool = defineTool({
  name: "getCollectionLink",
  label: "get the shareable Talli pay link for a collection",
  description:
    "Get the public Talli link for paying into a collection — the URL someone opens or forwards to pay " +
    "from the web, no in-chat tap needed. Use when someone asks for 'the link', 'the payment link', " +
    "'send me the link', 'share the collection', or wants to forward it to others. Optionally filter by " +
    "the collection's name; omit to get links for all payable collections. Read-only.",
  parameters: z.object({
    collectionName: z
      .string()
      .optional()
      .describe("Optional: the collection to link, matched loosely by title. Omit for all payable ones."),
  }),
  execute: async ({ collectionName }, ctx) => {
    const collections = await collectionService.listPayableForChat(ctx.linkedChatId, ctx.userId);
    if (collections.length === 0) {
      return { count: 0 };
    }

    const matched = collectionName
      ? collections.filter((c) => c.title.toLowerCase().includes(collectionName.toLowerCase()))
      : collections;

    if (collectionName && matched.length === 0) {
      return { count: 0, notFound: collectionName, available: collections.map((c) => c.title) };
    }

    const links = matched.map((c) => ({
      title: c.title,
      link: collectionService.payLink(c.id),
      amountPerMember: c.amountPerMember,
    }));

    return { count: links.length, links };
  },
});
