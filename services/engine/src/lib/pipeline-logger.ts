import logger from "./logger.js";

type LogLevel = "info" | "warn" | "error" | "debug";
type LogFields = Record<string, unknown>;

const PREFIX: Record<LogLevel, string> = {
  info: "[info]",
  warn: "[warn]",
  error: "[error]",
  debug: "[debug]",
};

interface PipelineLoggerOptions {
  /**
   * When `true`, logs are routed through Trigger.dev's `logger` so they
   * appear in the run timeline. Set to `true` from inside Trigger tasks,
   * `false` (or omit) from regular service code.
   */
  useTrigger?: boolean;
}

/**
 * Unified log helper for multi-stage pipelines (AI flows, ingestion,
 * background jobs). Use this so a single log record looks the same
 * whether it was emitted from a Trigger run or a normal Hono handler.
 */
export function pipelineLogger(opts: PipelineLoggerOptions = {}) {
  const useTrigger = opts.useTrigger ?? false;

  const emit = async (level: LogLevel, msg: string, fields?: LogFields) => {
    const tagged = `${PREFIX[level]} ${msg}`;
    if (useTrigger) {
      try {
        const mod = await import("@trigger.dev/sdk").catch(() => null);
        if (mod?.logger) {
          (mod.logger as unknown as Record<string, (m: string, f?: LogFields) => void>)[level](
            tagged,
            fields ?? {}
          );
          return;
        }
      } catch {}
    }
    if (fields) {
      logger.log(level, `${tagged} ${JSON.stringify(fields)}`);
      return;
    }
    logger.log(level, tagged);
  };

  return {
    info: (msg: string, f?: LogFields) => emit("info", msg, f),
    warn: (msg: string, f?: LogFields) => emit("warn", msg, f),
    error: (msg: string, f?: LogFields) => emit("error", msg, f),
    debug: (msg: string, f?: LogFields) => emit("debug", msg, f),
  };
}
