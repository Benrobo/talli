import { z } from "zod";

export const createLinkCodeSchema = z.object({
  platform: z.enum(["telegram", "whatsapp"]).default("telegram"),
  purpose: z.enum(["private_link", "group_link"]).default("private_link"),
});

export type CreateLinkCodeInput = z.infer<typeof createLinkCodeSchema>;
