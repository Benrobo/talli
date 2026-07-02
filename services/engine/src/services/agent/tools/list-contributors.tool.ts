import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { collectionService } from "../../collection.service.js";

/**
 * How to address a Telegram contributor in a reply. Prefer their @username; if we
 * only have their numeric id, use a Markdown text-mention that still pings them.
 * Web-only payers get no tag — just their name.
 */
function tagFor(c: {
  name: string;
  platform: string | null;
  platformUserId: string | null;
  username: string | null;
}): string | null {
  if (c.platform !== "telegram") return null;
  if (c.username) return `@${c.username}`;
  if (c.platformUserId) return `[${c.name}](tg://user?id=${c.platformUserId})`;
  return null;
}

export const listContributorsTool = defineTool({
  name: "listContributors",
  label: "list who has contributed to a collection and how much",
  description:
    "List everyone who has actually paid into a collection — their name, total contributed, and how many " +
    "times. Use for 'who has paid', 'who contributed', 'who chipped in', 'show me the contributors'. " +
    "Telegram contributors come with a tag so you can @-mention them in your reply. Optionally filter by " +
    "the collection's name; omit to use the chat's collection. Read-only.",
  parameters: z.object({
    collectionName: z
      .string()
      .optional()
      .describe("Optional: the collection to read, matched loosely by title. Omit for the chat's collection."),
  }),
  execute: async ({ collectionName }, ctx) => {
    const collections = await collectionService.listPayableForChat(ctx.linkedChatId, ctx.userId);
    if (collections.length === 0) {
      return { found: false, reason: "no_collections" };
    }

    const target = collectionName
      ? collections.find((c) => c.title.toLowerCase().includes(collectionName.toLowerCase()))
      : collections[0];

    if (!target) {
      return { found: false, reason: "name_not_found", available: collections.map((c) => c.title) };
    }

    const rows = await collectionService.listContributors(target.id);
    const contributors = rows.map((c) => ({
      name: c.name,
      amount: c.amount,
      times: c.count,
      tag: tagFor(c),
    }));

    return {
      found: true,
      collection: target.title,
      total: rows.reduce((sum, c) => sum + c.amount, 0),
      contributorCount: rows.length,
      contributors,
    };
  },
});
