import { PrismaClient } from "@prisma/client";
import env from "../config/env.js";

/**
 * Single Prisma client for the process. Logs queries in development for
 * easier debugging and disables verbose logging in production.
 */
const prisma = new PrismaClient({
  log: env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
});

export default prisma;
