import { BRAND, detailRow, emailLayout, heroBand, pill } from "./layout.js";

interface PaymentReceiptProps {
  payerName: string;
  amount: number;
  purpose: string;
  from: string;
  to: string;
  reference: string;
  dateLabel: string;
}

export function generatePaymentReceiptHtml(props: PaymentReceiptProps): string {
  const amount = `₦${props.amount.toLocaleString("en-NG")}`;
  const firstName = props.payerName.split(" ")[0] || props.payerName;

  const body = `
${heroBand({ eyebrow: "PAYMENT RECEIPT", big: amount, tone: "emerald" })}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding:26px 32px 8px;">
      ${pill("✓ Successful", "emerald")}
      <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">
        Hi ${firstName}, your payment for <strong>${props.purpose}</strong> went through. Here's your receipt — keep it for your records.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:6px 32px 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${detailRow("From", props.from)}
        ${detailRow("To", props.to)}
        ${detailRow("Purpose", props.purpose)}
        ${detailRow("Date", props.dateLabel)}
        ${detailRow("Reference", props.reference, { mono: true, last: true })}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:22px 32px 30px;">
      <div style="padding:14px 16px;border-radius:12px;background:${BRAND.emeraldSoft};">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#1f7d50;">
          <strong>Verified.</strong> This transfer was settled and confirmed by Nomba. No further action needed.
        </p>
      </div>
    </td>
  </tr>
</table>`;

  return emailLayout({
    title: `Receipt — ${amount} for ${props.purpose}`,
    preheader: `Your ${amount} payment for ${props.purpose} was successful.`,
    body,
  });
}
