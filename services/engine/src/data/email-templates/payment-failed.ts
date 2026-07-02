import { BRAND, button, detailRow, emailLayout, heroBand, pill } from "./layout.js";

interface PaymentFailedProps {
  payerName: string;
  amount: number;
  purpose: string;
  reference: string;
  retryUrl: string;
}

export function generatePaymentFailedHtml(props: PaymentFailedProps): string {
  const amount = `₦${props.amount.toLocaleString("en-NG")}`;
  const firstName = props.payerName.split(" ")[0] || props.payerName;

  const body = `
${heroBand({ eyebrow: "PAYMENT NOT CONFIRMED", big: amount, tone: "rose" })}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding:26px 32px 8px;">
      ${pill("Not confirmed", "rose")}
      <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">
        Hi ${firstName}, we couldn't confirm your ${amount} transfer for <strong>${props.purpose}</strong> in time, so we've closed it out for now.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 32px 4px;">
      <div style="padding:14px 16px;border-radius:12px;background:${BRAND.roseSoft};">
        <p style="margin:0;font-size:13.5px;line-height:1.7;color:#c02d33;">
          <strong>If you didn't send anything,</strong> relax — no money left your account.<br />
          <strong>If you did send it,</strong> don't worry either. If the bank settles it late, we'll spot it and credit this payment automatically — you'll get a confirmation email.
        </p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 32px 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${detailRow("Purpose", props.purpose)}
        ${detailRow("Amount", amount)}
        ${detailRow("Reference", props.reference, { mono: true, last: true })}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:22px 32px 32px;">
      ${button("Try again", props.retryUrl)}
    </td>
  </tr>
</table>`;

  return emailLayout({
    title: `We couldn't confirm your ${amount} payment`,
    preheader: `We couldn't confirm your ${amount} payment for ${props.purpose}. Nothing was taken if you didn't send it.`,
    body,
  });
}
