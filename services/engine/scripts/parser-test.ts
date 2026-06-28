import { commandParserService } from "../src/services/command-parser.service.js";
import { commandParserPrompt } from "../src/data/prompts/command-parser.prompt.js";
import { intentSchema } from "../src/schemas/intent.schema.js";
import env from "../src/config/env.js";

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  section("gating");
  console.log("group allowed:", commandParserService.allowedIntents("group"));
  console.log("dm allowed:   ", commandParserService.allowedIntents("private"));
  console.log("send in group blocked:", !commandParserService.isAllowed("group", "send_money") ? "✅" : "⚠️");
  console.log("send in dm allowed:   ", commandParserService.isAllowed("private", "send_money") ? "✅" : "⚠️");

  section("prompt renders");
  const rendered = commandParserPrompt.replace({
    message: "send 10k to Tolu",
    context: "Chat type: private DM\nKnown recipients: Tolu",
    allowedIntents: "create_collection, status_query, send_money",
  });
  console.log("contains message:", rendered.includes("send 10k to Tolu") ? "✅" : "⚠️");
  console.log("contains recipients:", rendered.includes("Known recipients: Tolu") ? "✅" : "⚠️");
  console.log("no leftover placeholders:", !/\{\{\w+\}\}/.test(rendered) ? "✅" : "⚠️");

  section("schema validates LLM-shaped JSON");
  const samples = [
    { intent: "send_money", status: "ready", amount: 10000, recipientName: "Tolu" },
    { intent: "create_collection", status: "needs_clarification", clarification: "How much per person?" },
    { intent: "unknown", status: "needs_clarification", clarification: "Could you rephrase?" },
  ];
  for (const s of samples) {
    const r = intentSchema.safeParse(s);
    console.log(`${s.intent}/${s.status}:`, r.success ? "✅" : `⚠️ ${r.error.issues[0]?.message}`);
  }

  if (!env.OPENROUTER_API_KEY) {
    section("live parse");
    console.log("⏭️  OPENROUTER_API_KEY not set — skipping live LLM parse");
    process.exit(0);
  }

  section("live parse");
  const cases: { msg: string; scope: "private" | "group" }[] = [
    { msg: "collect ₦5,000 from everyone for jerseys", scope: "group" },
    { msg: "send 10k to Tolu", scope: "private" },
    { msg: "save 2000 to my rent jar", scope: "private" },
    { msg: "send some money", scope: "private" },
    { msg: "what's the weather", scope: "private" },
  ];
  for (const c of cases) {
    const intent = await commandParserService.parse(c.msg, {
      scope: c.scope,
      workspaceName: "Test FC",
      knownJars: ["rent", "savings"],
      knownBeneficiaries: ["Tolu", "Mum"],
    });
    console.log(`\n[${c.scope}] "${c.msg}"`);
    console.dir(intent, { depth: null });
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
