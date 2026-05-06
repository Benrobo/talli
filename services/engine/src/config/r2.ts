import { S3Client } from "@aws-sdk/client-s3";
import env from "./env.js";

/**
 * Cloudflare R2 client. R2 is S3-compatible, so the AWS SDK works with
 * the right endpoint and region (`auto`).
 */
export const r2Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ENDPOINT || undefined,
  credentials: env.R2_ACCESS_KEY_ID
    ? {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      }
    : undefined,
  forcePathStyle: true,
});

export const r2Bucket = env.R2_BUCKET;
export const r2PublicUrl = env.R2_PUBLIC_URL;

/**
 * Resolve a public URL for an object key stored in R2. Returns the configured
 * `R2_PUBLIC_URL` joined with the key, or `null` when the bucket is not public.
 */
export function r2PublicUrlFor(key: string): string | null {
  if (!r2PublicUrl) return null;
  const base = r2PublicUrl.replace(/\/+$/, "");
  return `${base}/${key.replace(/^\/+/, "")}`;
}
