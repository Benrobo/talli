export const APP_NAME = "App";
export const AUTH_COOKIE_NAME = "app_auth";
export const REFRESH_COOKIE_NAME = "app_refresh";

export const API_PATHS = {
  health: "/health",
  auth: {
    me: "/api/auth/me",
    google: "/api/auth/google",
    googleCallback: "/api/auth/google/callback",
    logout: "/api/auth/logout",
    refresh: "/api/auth/refresh",
  },
  users: {
    list: "/api/users",
    byId: (id: string) => `/api/users/${id}`,
  },
} as const;

export const DEFAULT_PAGINATION_LIMIT = 20;
export const MAX_PAGINATION_LIMIT = 100;
