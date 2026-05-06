import { task } from "@trigger.dev/sdk";
import logger from "../lib/logger.js";

/**
 * Reference Trigger.dev task. Use this as a template:
 *
 *  1. `id` is the stable identifier — change it before shipping.
 *  2. `run` receives a typed payload and returns a serializable result.
 *  3. Trigger from anywhere in your engine code with `exampleTask.trigger({ ... })`.
 */
export const exampleTask = task({
  id: "example.echo",
  maxDuration: 60,
  run: async (payload: { message: string }) => {
    logger.info(`[trigger.example] received: ${payload.message}`);
    return {
      echoed: payload.message,
      receivedAt: new Date().toISOString(),
    };
  },
});
