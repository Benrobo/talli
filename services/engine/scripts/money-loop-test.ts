import { createHmac } from "node:crypto";
import prisma from "../src/prisma/index.js";
import env from "../src/config/env.js";
import { collectionService } from "../src/services/collection.service.js";
import { paymentService } from "../src/services/payment.service.js";

/**
 * Drives the whole collection money loop without Telegram/Postman:
 *   create collection → upsert member → start a real sandbox checkout
 *   → POST a signed payment_success webhook to the local endpoint
 *   → confirm the member is credited and the payment is marked successful.
 *
 * Run: bun run scripts/money-loop-test.ts
 */

const LOCAL = "http://localhost:7291/api/webhook/nomba";

function log(step: string, value: unknown) {
  console.log(`\n${step}`);
  console.dir(value, { depth: null });
}

/** Builds the §9.4 signing string + headers so the webhook passes verification. */
function signedWebhook(ref: string, amount: number) {
  const requestId = `evt_${Date.now()}`;
  const timestamp = new Date().toISOString();
  const data = {
    transactionId: "txn_test_1",
    type: "online_checkout",
    time: timestamp,
    responseCode: "00",
    transaction: {
      id: "txn_test_1",
      status: "SUCCESS",
      amount,
      type: "online_checkout",
      source: "web",
      merchantTxRef: ref,
      timeCreated: timestamp,
    },
  };
  const body = JSON.stringify({ event_type: "payment_success", requestId, data });
  const signingString = [
    "payment_success",
    requestId,
    "", // userId
    "", // walletId
    data.transactionId,
    data.type,
    data.time,
    data.responseCode,
    timestamp,
  ].join(":");
  const signature = createHmac("sha256", env.NOMBA_WEBHOOK_SECRET).update(signingString).digest("base64");
  return { body, headers: { "nomba-signature": signature, "nomba-timestamp": timestamp }, requestId };
}

async function main() {
  const ws = await prisma.workspace.findFirst({ select: { id: true, ownerUserId: true } });
  if (!ws) throw new Error("no workspace — sign up first");

  // 1. create collection (fixed ₦100 per person)
  const collection = await collectionService.create(ws.id, ws.ownerUserId, {
    title: "Money-loop test",
    purpose: "automated test",
    collectionType: "fixed_per_person",
    amountPerMember: 100,
  });
  log("1) collection created", { id: collection.id, amount: collection.amountPerMember });

  // 2. upsert a member (pay-to-enroll, as a chat tap would)
  const member = await collectionService.upsertMember({
    collectionId: collection.id,
    platform: "telegram",
    platformUserId: "tg_test_777",
    firstName: "Tester",
    username: "tester",
  });
  log("2) member upserted", { id: member.id, expected: member.expectedAmount, status: member.status });

  // 3. start a real sandbox checkout
  const started = await paymentService.startCollectionPayment({
    collectionId: collection.id,
    memberId: member.id,
    platform: "telegram",
    platformUserId: "tg_test_777",
  });
  log("3) checkout started", { ref: started.ref, paymentId: started.paymentId, link: started.checkoutLink.slice(0, 60) + "..." });

  // 4. POST a signed payment_success webhook to the local endpoint
  const { body, headers } = signedWebhook(started.ref, member.expectedAmount);
  const res = await fetch(LOCAL, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
  log("4) webhook POST", { status: res.status, body: await res.json() });

  // 5. verify crediting
  const settledPayment = await prisma.payment.findUnique({ where: { id: started.paymentId } });
  const creditedMember = await prisma.collectionMember.findUnique({ where: { id: member.id } });
  const finalCollection = await prisma.collection.findUnique({ where: { id: collection.id } });
  log("5) result", {
    paymentStatus: settledPayment?.status,
    memberPaidAmount: creditedMember?.paidAmount,
    memberStatus: creditedMember?.status,
    collectionStatus: finalCollection?.status,
  });

  // 6. idempotency: re-POST the SAME webhook → should not double-credit
  const dupRes = await fetch(LOCAL, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
  const afterDup = await prisma.collectionMember.findUnique({ where: { id: member.id } });
  log("6) idempotency (re-post same event)", {
    status: dupRes.status,
    memberPaidAmount: afterDup?.paidAmount,
    note: afterDup?.paidAmount === creditedMember?.paidAmount ? "no double-credit ✅" : "DOUBLE-CREDITED ⚠️",
  });

  // cleanup
  await prisma.payment.deleteMany({ where: { collectionId: collection.id } });
  await prisma.collectionMember.deleteMany({ where: { collectionId: collection.id } });
  await prisma.collection.delete({ where: { id: collection.id } });
  await prisma.platformUser.deleteMany({ where: { platformUserId: "tg_test_777" } });
  await prisma.webhookEvent.deleteMany({ where: { provider: "nomba", eventType: "payment_success" } });
  console.log("\ncleaned up");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
