import { defineConfig } from "@trigger.dev/sdk";

/**
 * Trigger.dev v4 config. Tasks live under `src/trigger/`.
 * Run `bun trigger:dev` for hot-reload during development and
 * `bun trigger:deploy` to ship them.
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "",
  runtime: "bun",
  logLevel: "info",
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10_000,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  maxDuration: 600,
});
