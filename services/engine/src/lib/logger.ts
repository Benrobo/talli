import { createLogger, format, transports } from "winston";
import env from "../config/env.js";

const { combine, timestamp, printf } = format;

const customFormat = printf(({ level, message, timestamp: ts }) => {
  if (typeof message === "object") {
    return `${ts} [${level}] : ${JSON.stringify(message)}`;
  }
  return `${ts} [${level}] : ${message}`;
});

const logger = createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss A" }),
    env.NODE_ENV !== "production" ? format.colorize() : format.uncolorize(),
    customFormat
  ),
  transports: [new transports.Console()],
});

export default logger;
