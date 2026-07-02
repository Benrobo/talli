import { z } from "zod";
import { defineTool } from "../define-tool.js";

export const askForDetailsTool = defineTool({
  name: "askForDetails",
  label: "ask the user for one missing detail before acting",
  description:
    "Use this ONLY when you're about to do an action (start a collection, create a jar, send money, save) " +
    "but one required detail is missing — a collection with no name, a send with no amount, etc. " +
    "Ask for the single missing thing in a short, natural question. Do NOT invent the value yourself. " +
    "This makes the question a real prompt the user can reply to, so their answer comes back to you. " +
    "Never use this for chit-chat or read requests — only when a real action is blocked on a missing detail.",
  parameters: z.object({
    question: z
      .string()
      .describe("The single short question to ask, e.g. 'What should we call this collection?'"),
  }),
  execute: async ({ question }, ctx) => {
    ctx.emit.clarify(question);
    return { ok: true, asked: question };
  },
});
