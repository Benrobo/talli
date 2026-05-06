/**
 * Web-side env. Vite exposes `import.meta.env.VITE_*` to the client bundle;
 * any other env var is unavailable in the browser by design.
 */
export const env = {
  ENGINE_API_URL: import.meta.env.VITE_ENGINE_API_URL ?? "http://localhost:6590",
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL ?? "http://localhost:6591",
};

export default env;
