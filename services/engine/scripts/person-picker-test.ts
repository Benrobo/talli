import prisma from "../src/prisma/index.js";
import { nomba } from "../src/integrations/nomba/index.js";
import { personPickerService } from "../src/services/person-picker.service.js";

function check(label: string, ok: boolean) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
}

async function main() {
  const ws = await prisma.workspace.findFirst({
    select: { id: true, ownerUserId: true },
  });
  const chat = await prisma.linkedChat.findFirst({ select: { id: true } });
  if (!ws || !chat) throw new Error("need workspace and linked chat");

  let seq = 0;
  nomba.checkout.createOrder = async () => ({
    checkoutLink: `https://pay.nomba.com/mock/${seq}`,
    orderReference: `mock_picker_${Date.now()}_${seq++}`,
  });
  nomba.checkout.getFlashAccount = async () => ({
    accountNumber: "9999000011",
    accountName: "Talli/Test",
    bankName: "Nombank MFB",
  });

  console.log("\n=== create picker ===");
  const { picker, url } = await personPickerService.createFromItems({
    workspaceId: ws.id,
    ownerUserId: ws.ownerUserId,
    linkedChatId: chat.id,
    title: "Picker smoke test",
    items: [
      { name: "Jollof rice", unitPrice: 4500 },
      { name: "Chapman", unitPrice: 2000 },
    ],
    total: 13000,
  });
  check("picker token prefixed", picker.token.startsWith("pk_"));
  check("picker url contains token", url.includes(picker.token));

  console.log("\n=== public read ===");
  const view = await personPickerService.getByToken(picker.token);
  check("two items returned", view.items.length === 2);

  console.log("\n=== checkout ===");
  const itemId = view.items[0]!.id;
  const checkout = await personPickerService.checkout(picker.token, {
    payerName: "Tolu",
    selections: [{ itemId, quantity: 2 }],
  });
  check("amount computed server-side", checkout.amount === 9000);
  check("checkout link returned", checkout.checkoutLink.startsWith("https://"));

  await prisma.personPickerSelection.deleteMany({ where: { pickerId: picker.id } });
  await prisma.pendingPayment.deleteMany({ where: { collectionId: picker.collectionId } });
  await prisma.collectionMember.deleteMany({ where: { collectionId: picker.collectionId } });
  await prisma.personPickerItem.deleteMany({ where: { pickerId: picker.id } });
  await prisma.personPicker.delete({ where: { id: picker.id } });
  await prisma.collection.delete({ where: { id: picker.collectionId } });
  console.log("\ncleaned up");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
