import env from "./env.js";

export const ENGINE_DEFAULT_PORT = 7291;
export const SOCKET_DEFAULT_PORT = 7292;
export const WEB_DEFAULT_PORT = 7193;
export const WEB_PREVIEW_PORT = 7194;
export const MARKETING_DEFAULT_PORT = 7195;

export const PORTLESS_WEB_HOST = "talli.localhost";
export const PORTLESS_WEB_URL = `https://${PORTLESS_WEB_HOST}`;

export const TUNNEL_API_HOST = "p7291.benlabtest.space";
export const TUNNEL_API_URL = `https://${TUNNEL_API_HOST}`;

export const API_BASE_PATH = "/api";

/**
 * Web dev uses portless (https://talli.localhost). Engine stays on :7291
 * locally; p7291 tunnel is for inbound webhooks only.
 */
export const CORS_ORIGINS = [
  env.CLIENT_URL,
  env.WEB_APP_URL,
  PORTLESS_WEB_URL,
  "http://localhost:7193",
  "http://localhost:7194",
  "http://localhost:7195",
  TUNNEL_API_URL,
].filter(Boolean) as string[];

export const PUBLIC_ROUTES = [
  "/health",
  "/api/health",
];

/** Secure auth cookies when the web app is served over HTTPS (portless). */
export const COOKIE_SECURE =
  env.NODE_ENV === "production" || env.WEB_APP_URL.startsWith("https://");
