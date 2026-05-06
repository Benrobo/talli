import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(6590),
  SOCKET_PORT: z.coerce.number().default(6591),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(60 * 15),
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(60 * 60 * 24 * 30),
  COOKIE_DOMAIN: z.string().optional(),

  WEB_APP_URL: z.string().url().default("http://localhost:5173"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),

  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z
    .string()
    .default("http://localhost:6590/api/auth/google/callback"),

  PLUNK_API_KEY: z.string().default(""),
  MAIL_FROM: z.string().default("noreply@example.com"),
  MAIL_REPLY_TO: z.string().optional(),

  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_BUCKET: z.string().default(""),
  R2_ENDPOINT: z.string().default(""),
  R2_PUBLIC_URL: z.string().default(""),

  OPENROUTER_API_KEY: z.string().default(""),

  TRIGGER_SECRET_KEY: z.string().default(""),
  TRIGGER_PROJECT_ID: z.string().default(""),

  FEATURE_FLAGS: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("[env] Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export default env;

export type Env = z.infer<typeof envSchema>;
