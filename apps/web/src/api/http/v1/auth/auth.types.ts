import { z } from "zod";
import type { ApiSuccess, User } from "@app/shared";

export const requestOtpSchema = z.object({
  email: z.string().email("A valid email is required"),
  mode: z.enum(["signup", "login"]).default("login"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/u, "Code must be 6 digits"),
  name: z.string().trim().min(1).max(80).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const authEmailFieldSchema = z.string().email("A valid email is required");
export const authNameFieldSchema = z.string().trim().min(1, "What should we call you?").max(80);
export const authCodeFieldSchema = z.string().regex(/^\d{6}$/u, "Code must be 6 digits");

export const updateProfileSchema = z.object({
  name: authNameFieldSchema,
});

export type AuthFormValues = {
  mode: "login" | "signup";
  name: string;
  email: string;
  code: string;
};

export type RequestOtpPayload = z.infer<typeof requestOtpSchema>;
export type VerifyOtpPayload = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenPayload = z.infer<typeof refreshTokenSchema>;
export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RequestOtpData {
  email: string;
  expiresIn: number;
}

export interface VerifyOtpData extends AuthTokens {
  user: User;
}

export type MeResponse = ApiSuccess<{ user: User }>;
export type UpdateProfileResponse = ApiSuccess<{ user: User }>;
export type RequestOtpResponse = ApiSuccess<RequestOtpData>;
export type VerifyOtpResponse = ApiSuccess<VerifyOtpData>;
export type RefreshTokenResponse = ApiSuccess<AuthTokens>;
export type LogoutResponse = ApiSuccess<null>;
