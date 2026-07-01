/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENGINE_API_URL?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
