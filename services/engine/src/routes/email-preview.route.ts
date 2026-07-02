import { Hono } from "hono";
import { generatePaymentReceiptHtml } from "../data/email-templates/payment-receipt.js";
import { generatePaymentFailedHtml } from "../data/email-templates/payment-failed.js";
import { generatePaymentRecoveredHtml } from "../data/email-templates/payment-recovered.js";
import { generateCollectionCompleteHtml } from "../data/email-templates/collection-complete.js";
import { generateWalletTopupHtml } from "../data/email-templates/wallet-topup.js";

const router = new Hono();

const SAMPLE_REF = "cmqy3e0r30006ilb";
const SAMPLE_RETRY_URL = "http://localhost:7193/pay/cmqy3e0r30006ilb";

const templates: Record<string, { label: string; render: () => string }> = {
  "payment-receipt": {
    label: "Payment receipt",
    render: () =>
      generatePaymentReceiptHtml({
        payerName: "Benaiah",
        amount: 20000,
        purpose: "Wedding Planning",
        from: "Benaiah Alumona",
        to: "Talli · Wedding Planning",
        reference: SAMPLE_REF,
        dateLabel: "1 Jul 2026, 2:14 PM",
      }),
  },
  "payment-failed": {
    label: "Payment not confirmed",
    render: () =>
      generatePaymentFailedHtml({
        payerName: "Benaiah",
        amount: 20000,
        purpose: "Wedding Planning",
        reference: SAMPLE_REF,
        retryUrl: SAMPLE_RETRY_URL,
      }),
  },
  "payment-recovered": {
    label: "Payment recovered",
    render: () =>
      generatePaymentRecoveredHtml({
        payerName: "Benaiah",
        amount: 20000,
        purpose: "Wedding Planning",
        reference: SAMPLE_REF,
        dateLabel: "1 Jul 2026, 6:02 PM",
      }),
  },
  "collection-complete": {
    label: "Collection complete",
    render: () =>
      generateCollectionCompleteHtml({
        ownerName: "Benaiah",
        title: "Wedding Planning",
        totalCollected: 240000,
        memberCount: 12,
      }),
  },
  "wallet-topup": {
    label: "Wallet top-up",
    render: () =>
      generateWalletTopupHtml({
        name: "Benaiah",
        amount: 20000,
        newBalance: 57500,
        reference: SAMPLE_REF,
        dateLabel: "1 Jul 2026, 9:30 AM",
      }),
  },
};

function indexPage(): string {
  const items = Object.entries(templates)
    .map(
      ([slug, { label }]) => `
      <li style="margin:0 0 10px;">
        <a href="/email-preview/${slug}"
           style="display:block;padding:16px 18px;border:1px solid #e7e5f0;border-radius:12px;text-decoration:none;color:#1b1830;background:#fff;">
          <span style="font-weight:700;font-size:15px;">${label}</span>
          <span style="display:block;margin-top:4px;font-size:12px;color:#9c99b5;font-family:ui-monospace,monospace;">/email-preview/${slug}</span>
        </a>
      </li>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Talli · Email previews</title>
</head>
<body style="margin:0;padding:40px 16px;background:#edecf3;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1b1830;margin:0 0 4px;">Email previews</h1>
    <p style="font-size:13px;color:#6b6880;margin:0 0 22px;">Transactional templates rendered with sample data. Dev only.</p>
    <ul style="list-style:none;padding:0;margin:0;">${items}</ul>
  </div>
</body>
</html>`;
}

router.get("/email-preview", (c) => c.html(indexPage()));

router.get("/email-preview/:template", (c) => {
  const template = templates[c.req.param("template")];
  if (!template) return c.text("Unknown template", 404);
  return c.html(template.render());
});

export default router;
