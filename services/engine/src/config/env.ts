import "dotenv/config";
import { z } from "zod";

const nodeEnv = process.env.NODE_ENV ?? "development";
const DEFAULT_ACCESS_TOKEN_TTL =
  nodeEnv === "development" ? 60 * 60 * 24 : Number(process.env.JWT_ACCESS_TOKEN_TTL );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(7291),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(DEFAULT_ACCESS_TOKEN_TTL),
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(60 * 60 * 24 * 30),
  COOKIE_DOMAIN: z.string().optional(),

  WEB_APP_URL: z.string().url().default("http://localhost:7193"),
  CLIENT_URL: z.string().url().default("http://localhost:7193"),
  PUBLIC_API_URL: z.string().url().optional(),

  MAIL_FROM: z.string().default("noreply@elorah.app"),

  CLOUDFLARE_API_TOKEN: z.string().default(""),
  CLOUDFLARE_ACCOUNT_ID: z.string().default(""),

  OPENROUTER_API_KEY: z.string().default(""),

  FEATURE_FLAGS: z.string().default(""),

  NOMBA_ENV: z.enum(["test", "live"]).default("live"),
  NOMBA_TEST_CLIENT_ID: z.string().default(""),
  NOMBA_TEST_PRIVATE_KEY: z.string().default(""),
  NOMBA_LIVE_CLIENT_ID: z.string().default(""),
  NOMBA_LIVE_PRIVATE_KEY: z.string().default(""),
  NOMBA_PARENT_ACCOUNT_ID: z.string().default(""),
  NOMBA_SUB_ACCOUNT_ID: z.string().default(""),
  NOMBA_WEBHOOK_SECRET: z.string().default(""),

  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_BOT_USERNAME: z.string().default(""),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(""),
  TELEGRAM_INFO_BANNER_URL: z
    .string()
    .default("https://res.cloudinary.com/dmi4vivcw/image/upload/v1782595988/talli-img-banner.png"),

  CHAT_LINK_CODE_TTL_MINUTES: z.coerce.number().default(15),
  PAYMENT_PAGE_BASE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("[env] Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const ONE_DAY_SECONDS = 60 * 60 * 24;

export const env = {
  ...parsed.data,
  // JWT_ACCESS_TOKEN_TTL:
  //   parsed.data.NODE_ENV === "development" ? ONE_DAY_SECONDS : parsed.data.JWT_ACCESS_TOKEN_TTL,
  JWT_ACCESS_TOKEN_TTL: ONE_DAY_SECONDS
};
export default env;

export type Env = z.infer<typeof envSchema>;

/**
 * Nomba config grouped by environment. Credentials are per-env (a test
 * client_id/secret only works on sandbox, live only on production); the
 * account ids and webhook secret are shared. The SDK reads from here so it
 * can target either env in the same process.
 */
export const nombaConfig = {
  env: env.NOMBA_ENV,
  parentAccountId: env.NOMBA_PARENT_ACCOUNT_ID,
  subAccountId: env.NOMBA_SUB_ACCOUNT_ID,
  webhookSecret: env.NOMBA_WEBHOOK_SECRET,
  test: {
    clientId: env.NOMBA_TEST_CLIENT_ID,
    privateKey: env.NOMBA_TEST_PRIVATE_KEY,
  },
  live: {
    clientId: env.NOMBA_LIVE_CLIENT_ID,
    privateKey: env.NOMBA_LIVE_PRIVATE_KEY,
  },
} as const;
