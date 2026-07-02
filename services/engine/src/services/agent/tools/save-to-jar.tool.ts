import { z } from "zod";
import { defineTool } from "../define-tool.js";
import { savingsService } from "../../savings.service.js";
import { ledgerService } from "../../ledger.service.js";

export const saveToJarTool = defineTool({
  name: "saveToJar",
  description:
    "Prepare moving money from the wallet into an existing savings jar. Use for 'save 2000 to my rent jar', 'add 5k to laptop'. " +
    "Needs which jar and how much. Prepares a confirm card; it does not move money. DM only.",
  parameters: z.object({
    jarName: z.string().describe("Which existing jar to save into, e.g. 'rent'."),
    amount: z.number().int().positive().describe("Whole-naira amount to move from wallet into the jar."),
  }),
  execute: async ({ jarName, amount }, ctx) => {
    if (ctx.scope !== "private") {
      return { ok: false, reason: "Saving into a jar is personal — this only works in a DM with me." };
    }

    const jar = await savingsService.findByName(ctx.userId, jarName);
    if (!jar) {
      const jars = await savingsService.list(ctx.userId);
      return { ok: false, reason: "no_such_jar", jarNames: jars.map((j) => j.name) };
    }

    const balance = await ledgerService.getBalance(ctx.userId);
    if (balance < amount) {
      return { ok: false, reason: "insufficient_balance", walletBalance: balance, needed: amount };
    }

    ctx.emit.proposal({
      intent: "save_to_jar",
      status: "ready",
      title: jar.name,
      amount,
    });
    return { ok: true, prepared: { jar: jar.name, amount } };
  },
});
