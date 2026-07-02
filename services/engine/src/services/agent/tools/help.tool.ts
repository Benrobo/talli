import { z } from "zod";
import { defineTool } from "../define-tool.js";

export const helpTool = defineTool({
  name: "help",
  description:
    "Explain what Talli can do here, in the user's words. Use when someone asks what you can do, says hi and seems lost, or asks how something works (like splitting a bill by photo). Read-only.",
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    if (ctx.scope === "group") {
      return {
        canDo: [
          "start a collection from everyone (admins)",
          "split a bill from a photo (admins) — just send the receipt photo and mention me",
          "show how a collection is going and who has paid",
          "surface a pay button so members can chip in",
        ],
      };
    }
    return {
      canDo: [
        "open a savings jar and save into it",
        "send money to a bank account or a saved recipient",
        "tell you your balance, savings, and collection progress",
        "split a bill from a photo — send the receipt photo",
      ],
    };
  },
});
