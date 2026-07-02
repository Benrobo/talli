import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { balanceService } from "../../balance.service.js";

export const getCollectionProgressTool = defineTool({
  name: "getCollectionProgress",
  label: "show how a collection is going (collected, how many paid)",
  description:
    "Look up how a collection is going — how much has been collected, how many people have paid, and the target. " +
    "Use for 'how much have we collected', 'how many people paid', 'how's the football money going'. Read-only.",
  parameters: z.object({
    collectionName: z
      .string()
      .optional()
      .describe("Optional: focus on one collection by title. Omit to list all active collections."),
  }),
  execute: async ({ collectionName }, ctx) => {
    const overview = await balanceService.overview(ctx.userId);
    const collections = overview.collections;

    if (collectionName) {
      const needle = collectionName.toLowerCase();
      const match = collections.find((c) => c.title.toLowerCase().includes(needle));
      if (!match) {
        return { found: false, collectionTitles: collections.map((c) => c.title) };
      }
      return { found: true, collection: match };
    }

    return { count: collections.length, collections };
  },
});
