import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { savingsService } from "../../savings.service.js";

export const getSavingsTool = defineTool({
  name: "getSavings",
  label: "show your savings jars and how much is in each",
  description:
    "Look up the user's savings jars and how much is in each. " +
    "Use for 'how much have I saved', 'how many jars do I have', 'how's my rent jar doing'. Read-only. DM only.",
  parameters: z.object({
    jarName: z
      .string()
      .optional()
      .describe("Optional: focus on one jar by name, e.g. 'rent'. Omit to list all jars."),
  }),
  execute: async ({ jarName }, ctx) => {
    const jars = await savingsService.list(ctx.userId);
    const shaped = jars.map((j) => ({
      name: j.name,
      currentAmount: j.currentAmount,
      targetAmount: j.targetAmount,
      status: j.status,
    }));

    if (jarName) {
      const needle = jarName.toLowerCase();
      const match = shaped.find((j) => j.name.toLowerCase().includes(needle));
      if (!match) {
        return { found: false, jarNames: shaped.map((j) => j.name) };
      }
      return { found: true, jar: match };
    }

    return {
      count: shaped.length,
      total: shaped.reduce((sum, j) => sum + j.currentAmount, 0),
      jars: shaped,
    };
  },
});
