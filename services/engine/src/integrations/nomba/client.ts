import retry from "async-retry";
import { nombaConfig } from "../../config/env.js";
import logger from "../../lib/logger.js";
import { NombaAuth } from "./auth.js";
import { NombaError } from "./errors.js";
import { NOMBA_BASE_URLS, type NombaEnv, type NombaEnvelope } from "./types.js";

const RETRY_OPTIONS: retry.Options = {
  retries: 2,
  factor: 2,
  minTimeout: 300,
  maxTimeout: 2000,
};

export interface NombaRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  accountId?: string;
}

/**
 * Thrown only to drive `async-retry`'s backoff on transient failures
 * (`429`/`5xx`/network). It never escapes `request` — the final attempt either
 * returns parsed data or throws a `NombaError`.
 */
class RetryableError extends Error {}

/**
 * The single place that sends requests to Nomba. Resolves the base URL from
 * `NOMBA_ENV`, attaches the bearer token + `accountId` header, unwraps the
 * `{ code, description, data }` envelope, and throws a `NombaError` on any
 * non-`"00"` reply. Uses `async-retry` to back off on `429`/`5xx`/network
 * errors and to re-auth once on `401`. No other file in the SDK makes raw
 * HTTP calls.
 */
export class NombaHttpClient {
  private readonly baseUrl: string;
  private readonly auth: NombaAuth;

  constructor(nombaEnv: NombaEnv = nombaConfig.env, auth?: NombaAuth) {
    this.baseUrl = NOMBA_BASE_URLS[nombaEnv];
    this.auth = auth ?? new NombaAuth(nombaEnv);
  }

  async request<T>(options: NombaRequestOptions): Promise<T> {
    const url = this.buildUrl(options.path, options.query);

    try {
      return await retry(async (bail, attempt) => {
        const res = await this.send(url, options, attempt > 1);

        if (res.status === 401 && attempt === 1) {
          await this.auth.invalidate();
          throw new RetryableError("token rejected, re-authenticating");
        }

        if (this.shouldRetry(res.status)) {
          throw new RetryableError(`retryable status ${res.status}`);
        }

        try {
          return await this.parse<T>(res, options);
        } catch (err) {
          bail(err as Error);
          throw err;
        }
      }, RETRY_OPTIONS);
    } catch (err) {
      if (err instanceof NombaError) throw err;
      logger.error(`[nomba] ${options.method ?? "GET"} ${options.path} failed after retries: ${(err as Error).message}`);
      throw new NombaError({
        message: "Nomba is temporarily unavailable, please try again",
        httpStatus: 502,
        nombaCode: null,
        description: "request_failed",
      });
    }
  }

  private async send(
    url: string,
    options: NombaRequestOptions,
    forceFreshToken: boolean
  ): Promise<Response> {
    if (forceFreshToken) await this.auth.invalidate();
    const token = await this.auth.getAccessToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      accountId: options.accountId ?? nombaConfig.parentAccountId,
    };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    try {
      return await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (err) {
      throw new RetryableError(`network error: ${(err as Error).message}`);
    }
  }

  private async parse<T>(res: Response, options: NombaRequestOptions): Promise<T> {
    const body = (await res.json().catch(() => null)) as NombaEnvelope<T> | null;

    if (!body || typeof body.code !== "string") {
      logger.error(`[nomba] ${options.method ?? "GET"} ${options.path} returned unparseable body (http ${res.status})`);
      throw new NombaError({
        message: "Unexpected response from Nomba",
        httpStatus: res.ok ? 502 : res.status,
        nombaCode: null,
        description: "invalid_response",
      });
    }

    if (body.code !== "00") {
      logger.error(`[nomba] ${options.method ?? "GET"} ${options.path} → code ${body.code}: ${body.description}`);
      throw new NombaError({
        message: body.description || "Nomba request was not successful",
        httpStatus: res.ok ? 422 : res.status,
        nombaCode: body.code,
        description: body.description,
      });
    }

    return body.data;
  }

  private buildUrl(path: string, query?: NombaRequestOptions["query"]): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private shouldRetry(status: number): boolean {
    return status === 429 || status >= 500;
  }
}
