import dayjs from "dayjs";
import { nomba } from "../integrations/nomba/index.js";
import { NombaHttpClient } from "../integrations/nomba/client.js";
import prisma from "../prisma/index.js";

const http = new NombaHttpClient();

async function tryCall(label: string, fn: () => Promise<unknown>) {
  console.log(`\n===== ${label} =====`);
  try {
    const res = await fn();
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.log("FAILED:", (err as Error).message);
  }
}

async function main() {
  const va = process.argv[2] ?? (await prisma.virtualAccount.findFirst())?.accountNumber;
  if (!va) {
    console.log("no VA; pass one as arg");
    return;
  }
  const dateFrom = dayjs().subtract(3, "day").format("YYYY-MM-DD");
  const dateTo = dayjs().add(1, "day").format("YYYY-MM-DD");
  console.log("Probing VA:", va, "window", dateFrom, "→", dateTo);

  await tryCall("1. Parent account balance", () => nomba.accounts.getBalance());

  await tryCall("2. VA transactions (/v1/transactions/virtual)", () =>
    nomba.transactions.listByVirtualAccount({ virtualAccountNumber: va, dateFrom, dateTo })
  );

  await tryCall("3. Parent transactions (/v1/transactions/accounts)", () =>
    nomba.transactions.list({ dateFrom, dateTo, limit: 50 })
  );

  await tryCall("4. Credit/debit on parent (/v1/transactions/accounts/credit-debit)", () =>
    http.request({
      method: "GET",
      path: "/v1/transactions/accounts/credit-debit",
      query: { dateFrom, dateTo, limit: 50 },
    })
  );

  await tryCall("5. Filter parent transactions (POST /v1/transactions/accounts)", () =>
    http.request({
      method: "POST",
      path: "/v1/transactions/accounts",
      body: { dateFrom, dateTo },
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
