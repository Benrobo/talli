function resolveEngineApiUrl(): string {
  const raw = import.meta.env.VITE_ENGINE_API_URL;
  if (raw === "") return "";
  if (raw) return raw;
  return "http://localhost:7291";
}

function resolveSocketUrl(apiUrl: string): string {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (apiUrl) return apiUrl;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:7291";
}

const ENGINE_API_URL = resolveEngineApiUrl();

export const env = {
  BASE_URL: import.meta.env.VITE_BASE_URL ?? "http://localhost:7193",
  ENGINE_API_URL,
  SOCKET_URL: resolveSocketUrl(ENGINE_API_URL),
};

export default env;
