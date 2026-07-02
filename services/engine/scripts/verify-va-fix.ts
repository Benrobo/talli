import dayjs from "dayjs";
import { nomba } from "../src/integrations/nomba/index.js";

const VA = "2292947643";
const AMOUNT = 20;
const dateFrom = dayjs().subtract(2, "day").format("YYYY-MM-DD");
const dateTo = dayjs().add(1, "day").format("YYYY-MM-DD");

const page = await nomba.transactions.listByVirtualAccount({ virtualAccountNumber: VA, dateFrom, dateTo });
console.log(`fetched ${page.results?.length ?? 0} tx via fixed listByVirtualAccount()`);

const toNaira = (v: unknown) => { const n = typeof v === "string" ? Number(v) : (v as number); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };
const match = (page.results ?? []).find((tx) =>
  String(tx.status).toUpperCase() === "SUCCESS" &&
  String(tx.entryType).toUpperCase() === "CREDIT" &&
  tx.recipientAccountNumber === VA &&
  toNaira(tx.amount) === AMOUNT
);
console.log(match ? "✅ MATCH — the ₦20 credit is found by the new matcher" : "❌ no match");
if (match) console.log({ amount: match.amount, entryType: match.entryType, to: match.recipientAccountNumber, vaRef: match.virtualAccountReference, sessionId: match.sessionId, time: match.timeCreated });
process.exit(0);
