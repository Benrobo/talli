import { commandParserService } from "../src/services/command-parser.service.js";
const cases = [
  { msg: "send 20ngn to tayo", ctx: { scope: "private" as const } },
  { msg: "send 5000 to GTB 0123456789", ctx: { scope: "private" as const } },
  { msg: "send 10k to tayo", ctx: { scope: "private" as const, knownBeneficiaries: ["tayo"] } },
];
for (const c of cases) {
  const r = await commandParserService.parse(c.msg, c.ctx);
  console.log(`"${c.msg}" [known: ${(c.ctx as any).knownBeneficiaries ?? "none"}]`);
  console.log(`  -> intent=${r.intent} status=${r.status} recipient=${r.recipientName ?? "-"} acct=${r.accountNumber ?? "-"} bank=${r.bankName ?? "-"}`);
  console.log(`  clarify: ${r.clarification ?? "-"}`);
}
process.exit(0);
