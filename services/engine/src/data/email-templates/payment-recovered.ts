import { BRAND, detailRow, emailLayout, heroBand, pill } from "./layout.js";

interface PaymentRecoveredProps {
  payerName: string;
  amount: number;
  purpose: string;
  reference: string;
  dateLabel: string;
}

export function generatePaymentRecoveredHtml(props: PaymentRecoveredProps): string {
  const amount = `₦${props.amount.toLocaleString("en-NG")}`;
  const firstName = props.payerName.split(" ")[0] || props.payerName;

  const body = `
${heroBand({ eyebrow: "PAYMENT CONFIRMED", big: amount, tone: "emerald" })}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding:26px 32px 8px;">
      ${pill("✓ Recovered", "emerald")}
      <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">
        Good news, ${firstName} — your earlier payment came through after all. Your ${amount} transfer for <strong>${props.purpose}</strong> settled a little late, and we've now caught it.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:6px 32px 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${detailRow("Purpose", props.purpose)}
        ${detailRow("Amount", amount)}
        ${detailRow("Confirmed", props.dateLabel)}
        ${detailRow("Reference", props.reference, { mono: true, last: true })}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:22px 32px 30px;">
      <div style="padding:14px 16px;border-radius:12px;background:${BRAND.emeraldSoft};">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#1f7d50;">
          <strong>You're all set.</strong> This payment now counts toward <strong>${props.purpose}</strong> — nothing else to do.
        </p>
      </div>
    </td>
  </tr>
</table>`;

  return emailLayout({
    title: `Confirmed — your ${amount} payment came through`,
    preheader: `Good news — your earlier ${amount} payment for ${props.purpose} came through after all.`,
    body,
  });
}
