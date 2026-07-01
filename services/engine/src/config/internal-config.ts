import env from "./env.js";

export const ENGINE_DEFAULT_PORT = 7191;
export const SOCKET_DEFAULT_PORT = 7192;
export const WEB_DEFAULT_PORT = 7193;
export const WEB_PREVIEW_PORT = 7194;
export const MARKETING_DEFAULT_PORT = 7195;
export const MOBILE_DEFAULT_PORT = 7196;

export const API_BASE_PATH = "/api";

/**
 * Origins permitted to call the engine and connect to the socket server.
 * Every starter port lives in the 719x range to avoid collisions with
 * other projects on the host. Add production hostnames here as you ship
 * environments.
 */
export const CORS_ORIGINS = [
  env.CLIENT_URL,
  env.WEB_APP_URL,
  "http://localhost:7193",
  "http://localhost:7194",
  "http://localhost:7195",
  "http://localhost:7196",
];

export const PUBLIC_ROUTES = [
  "/health",
  "/api/health",
  "/api/auth/google",
  "/api/auth/google/callback",
];
