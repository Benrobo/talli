import { z } from "zod";
import { defineTool } from "../define-tool.js";

export const createJarTool = defineTool({
  name: "createJar",
  label: "open a personal savings jar",
  description:
    "Prepare a new personal savings jar (a goal). Use for 'open a rent jar', 'start saving for a laptop'. " +
    "Needs a natural jar name and a savings target. This prepares a confirm card; it does not create the jar. DM only.",
  parameters: z.object({
    title: z.string().describe("A short, motivating name for the jar, e.g. 'Rent' or 'New laptop'."),
    targetAmount: z.number().int().positive().describe("The savings target in whole naira."),
  }),
  execute: async ({ title, targetAmount }, ctx) => {
    if (ctx.scope !== "private") {
      return { ok: false, reason: "Savings jars are personal — this only works in a DM with me." };
    }
    ctx.emit.proposal({
      intent: "create_jar",
      status: "ready",
      title,
      amount: targetAmount,
    });
    return { ok: true, prepared: { title, targetAmount } };
  },
});
