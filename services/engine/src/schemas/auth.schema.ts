import { z } from "zod";

export const requestOtpSchema = z.object({
  email: z.string().email("A valid email is required"),
  mode: z.enum(["signup", "login"]).default("login"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/u, "Code must be 6 digits"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
