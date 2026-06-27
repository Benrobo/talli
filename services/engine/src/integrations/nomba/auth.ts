import dayjs from "dayjs";
import { nombaConfig } from "../../config/env.js";
import cacheAdapter from "../../lib/cache-adapter.js";
import logger from "../../lib/logger.js";
import { NombaError } from "./errors.js";
import { NOMBA_BASE_URLS, type NombaEnv, type NombaEnvelope, type NombaTokenData } from "./types.js";

const TOKEN_EXPIRY_SKEW_SECONDS = 60;

/**
 * Owns the Nomba access token: fetches it, caches it in Redis keyed by
 * environment, and re-issues it shortly before expiry. The HTTP client asks
 * this for a bearer token and never deals with credentials itself.
 *
 * Token issue/refresh is the one place that talks to `/v1/auth/token/*`
 * directly, since the HTTP client depends on it (avoiding a cycle).
 */
export class NombaAuth {
  private readonly baseUrl: string;
  private readonly cacheKey: string;
  private readonly clientId: string;
  private readonly privateKey: string;
  private inFlight: Promise<string> | null = null;

  constructor(nombaEnv: NombaEnv = nombaConfig.env) {
    this.baseUrl = NOMBA_BASE_URLS[nombaEnv];
    this.cacheKey = `nomba:token:${nombaEnv}`;
    this.clientId = nombaConfig[nombaEnv].clientId;
    this.privateKey = nombaConfig[nombaEnv].privateKey;
  }

  /**
   * Returns a valid bearer token, fetching and caching a fresh one on a miss.
   * Concurrent callers during a refresh share a single in-flight request.
   */
  async getAccessToken(): Promise<string> {
    const cached = await cacheAdapter.get(this.cacheKey);
    if (cached) return cached;

    if (this.inFlight) return this.inFlight;

    this.inFlight = this.issueAndCache().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /** Drops the cached token so the next call re-issues. */
  async invalidate(): Promise<void> {
    await cacheAdapter.del(this.cacheKey);
  }

  private async issueAndCache(): Promise<string> {
    const data = await this.requestToken();
    const ttl = this.cacheTtlSeconds(data.expiresAt);
    if (ttl > 0) {
      await cacheAdapter.set(this.cacheKey, data.access_token, ttl);
    }
    return data.access_token;
  }

  private async requestToken(): Promise<NombaTokenData> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/v1/auth/token/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accountId: nombaConfig.parentAccountId,
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: this.clientId,
          client_secret: this.privateKey,
        }),
      });
    } catch (err) {
      throw new NombaError({
        message: `Nomba token request failed: ${(err as Error).message}`,
        httpStatus: 502,
        nombaCode: null,
        description: "token_request_failed",
      });
    }

    const body = (await res.json().catch(() => null)) as NombaEnvelope<NombaTokenData> | null;

    if (!res.ok || !body || body.code !== "00" || !body.data?.access_token) {
      logger.error(`[nomba] token issue failed (http ${res.status}): ${body?.description ?? "unknown"}`);
      throw new NombaError({
        message: "Failed to authenticate with Nomba",
        httpStatus: res.ok ? 502 : res.status,
        nombaCode: body?.code ?? null,
        description: body?.description ?? "token_issue_failed",
      });
    }

    return body.data;
  }

  /** Seconds to cache, derived from `expiresAt` minus a safety skew. */
  private cacheTtlSeconds(expiresAt: string): number {
    const expiry = dayjs(expiresAt);
    if (!expiry.isValid()) return 0;
    const secondsLeft = expiry.diff(dayjs(), "second");
    return secondsLeft - TOKEN_EXPIRY_SKEW_SECONDS;
  }
}
