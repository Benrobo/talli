import env from "./env.js";

export const ENGINE_DEFAULT_PORT = 6590;
export const SOCKET_DEFAULT_PORT = 6591;
export const API_BASE_PATH = "/api";

/**
 * Origins permitted to call the engine and connect to the socket server.
 * Add production hostnames here as you ship environments.
 */
export const CORS_ORIGINS = [
  env.CLIENT_URL,
  env.WEB_APP_URL,
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
];

export const PUBLIC_ROUTES = ["/health", "/api/health", "/api/auth/google", "/api/auth/google/callback"];
