/**
 * Web-side env. Vite exposes `import.meta.env.VITE_*` to the client bundle.
 *
 * With portless dev, open https://talli.localhost and leave VITE_ENGINE_API_URL
 * empty so requests go through the Vite /api proxy.
 */
function resolveEngineApiUrl(): string {
  const raw = import.meta.env.VITE_ENGINE_API_URL;
  if (raw === "") return "";
  if (raw) return raw;
  return "http://localhost:7291";
}

export const env = {
  BASE_URL: import.meta.env.VITE_BASE_URL ?? "https://talli.localhost",
  ENGINE_API_URL: resolveEngineApiUrl(),
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL ?? "http://localhost:7292",
};

export default env;
