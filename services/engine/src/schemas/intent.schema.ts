import { z } from "zod";

export const INTENTS = [
  "create_collection",
  "create_jar",
  "save_to_jar",
  "send_money",
  "status_query",
  "unknown",
] as const;

export const intentSchema = z.object({
  intent: z.enum(INTENTS),
  status: z.enum(["ready", "needs_clarification"]),
  clarification: z.string().optional(),
  amount: z.number().int().positive().optional(),
  title: z.string().optional(),
  recipientName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  target: z.string().optional(),
});

export type Intent = z.infer<typeof intentSchema>;
export type IntentName = (typeof INTENTS)[number];
