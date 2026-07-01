import { NombaSdk, NombaError, type NombaEnv } from "../src/integrations/nomba/index.js";
import { nombaConfig } from "../src/config/env.js";

/**
 * Smoke-runs the Nomba SDK and logs each response, so you can eyeball that auth,
 * banks, balance, and lookup come back the way the docs describe. Read-only —
 * no money moves.
 *
 * Env: defaults to NOMBA_ENV. Override per-run without touching .env:
 *   bun run scripts/nomba-smoke.ts            # uses NOMBA_ENV (sandbox by default)
 *   bun run scripts/nomba-smoke.ts live       # real NIBSS lookups against production
 *   bun run scripts/nomba-smoke.ts test       # force sandbox
 *
 * Sandbox bank lookups return mock data (random names), so to verify a REAL
 * account holder name you must run with `live`.
 */

const arg = process.argv[2];
const targetEnv: NombaEnv = arg === "live" || arg === "test" ? arg : nombaConfig.env;
const nomba = new NombaSdk(targetEnv);

function log(label: string, value: unknown): void {
  console.log(`\n=== ${label} ===`);
  console.dir(value, { depth: null });
}

async function step(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    log(label, result);
  } catch (err) {
    if (err instanceof NombaError) {
      console.error(`\n=== ${label} FAILED ===`);
      console.error(`code=${err.nombaCode} http=${err.statusCode} desc=${err.description}`);
    } else {
      console.error(`\n=== ${label} FAILED ===`);
      console.error(err);
    }
  }
}

async function main(): Promise<void> {
  console.log(`Nomba SDK smoke test — ${targetEnv === "live" ? "LIVE (production)" : "sandbox"}\n`);

  await step("account balance", () => nomba.accounts.getBalance());

  // await step("account data lookup", () => nomba.transfers.lookupAccount({ accountNumber: "0123456789", bankCode: "GTB" }));

  await step("list banks (first 3)", async () => {
    const banks = await nomba.transfers.listBanks();
    console.log(`Zenith bank code: ${banks.find((bank) => bank.name === "Zenith Bank")?.code}`);
    return { count: banks.length, sample: banks.slice(0, 3) };
  });

  await step("bank account lookup", () =>
    nomba.transfers.lookupAccount({ accountNumber: "2265567117", bankCode: "057" })
  );

  // await step("create checkout order", () =>
  //   nomba.checkout.createOrder({
  //     orderReference: `smoke-${Date.now()}`,
  //     callbackUrl: "https://talli.app/api/nomba/webhook",
  //     customerEmail: "payer@example.com",
  //     amount: 3000,
  //   })
  // );

  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
