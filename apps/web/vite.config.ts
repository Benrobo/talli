import { defineConfig, loadEnv } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

const ENGINE_DEFAULT_PORT = 7291;

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, resolve(__dirname, "../.."), "");
  const enginePort = Number(rootEnv.PORT) || ENGINE_DEFAULT_PORT;

  return {
    plugins: [
      TanStackRouterVite({ autoCodeSplitting: true }),
      viteReact(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 7193,
      allowedHosts: ["talli.localhost"],
      proxy: {
        "/api": {
          target: `http://localhost:${enginePort}`,
          changeOrigin: true,
        },
        "/socket.io": {
          target: `http://localhost:${enginePort}`,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      port: 7194,
    },
  };
});
