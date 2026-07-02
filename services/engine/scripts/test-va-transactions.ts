import dayjs from "dayjs";
import { nomba } from "../src/integrations/nomba/index.js";
import prisma from "../src/prisma/index.js";

async function main() {
  const va = process.argv[2];
  const account = va
    ? { accountNumber: va }
    : await prisma.virtualAccount.findFirst({ orderBy: { createdAt: "desc" } });

  if (!account) {
    console.log("No virtual account found. Pass an account number: bun run scripts/test-va-transactions.ts <accountNumber>");
    return;
  }

  const accountNumber = account.accountNumber;
  const dateFrom = dayjs().subtract(2, "day").format("YYYY-MM-DD");
  const dateTo = dayjs().add(1, "day").format("YYYY-MM-DD");

  console.log("=== VA transactions probe ===");
  console.log({ accountNumber, dateFrom, dateTo });

  try {
    const page = await nomba.transactions.listByVirtualAccount({
      virtualAccountNumber: accountNumber,
      dateFrom,
      dateTo,
    });

    console.log("\n=== RAW RESPONSE (what the poll code receives) ===");
    console.log(JSON.stringify(page, null, 2));

    const results = (page as { results?: unknown[] }).results;
    console.log("\npage.results is:", Array.isArray(results) ? `array(${results.length})` : typeof results);

    if (Array.isArray(results)) {
      results.forEach((tx, i) => {
        const t = tx as Record<string, unknown>;
        console.log(`\n--- tx[${i}] ---`);
        console.log({
          status: t.status,
          amount: t.amount,
          type: t.type,
          entryType: t.entryType,
          timeCreated: t.timeCreated,
          sessionId: t.sessionId,
          transactionId: t.transactionId,
          id: t.id,
          keys: Object.keys(t),
        });
      });
    }
  } catch (err) {
    console.log("\n=== VA REQUEST FAILED ===");
    console.log((err as Error).message);
  }

  console.log("\n\n=== FALLBACK: parent account transactions (all accounts) ===");
  try {
    const page = await nomba.transactions.list({ dateFrom, dateTo, limit: 20 });
    console.log(JSON.stringify(page, null, 2));
  } catch (err) {
    console.log("parent list failed:", (err as Error).message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
