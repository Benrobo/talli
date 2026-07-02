import prisma from "../src/prisma/index.js";
const w = await prisma.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
console.log("webhook events:", w.length);
console.log(w.map((e) => ({ provider: e.provider, eventType: e.eventType, status: e.processingStatus, at: e.createdAt })));
process.exit(0);
