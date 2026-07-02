import { BRAND, detailRow, emailLayout, heroBand, pill } from "./layout.js";

interface WalletTopupProps {
  name: string;
  amount: number;
  newBalance: number;
  reference: string;
  dateLabel: string;
}

export function generateWalletTopupHtml(props: WalletTopupProps): string {
  const amount = `₦${props.amount.toLocaleString("en-NG")}`;
  const balance = `₦${props.newBalance.toLocaleString("en-NG")}`;
  const firstName = props.name.split(" ")[0] || props.name;

  const body = `
${heroBand({ eyebrow: "WALLET FUNDED", big: `+ ${amount}`, sub: `New balance ${balance}`, tone: "emerald" })}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding:26px 32px 8px;">
      ${pill("✓ Added", "emerald")}
      <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">
        Hi ${firstName}, ${amount} just landed in your Talli wallet. It's available to spend or send right away.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:6px 32px 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${detailRow("Amount added", amount)}
        ${detailRow("New balance", balance)}
        ${detailRow("Date", props.dateLabel)}
        ${detailRow("Reference", props.reference, { mono: true, last: true })}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:22px 32px 30px;">
      <div style="padding:14px 16px;border-radius:12px;background:${BRAND.emeraldSoft};">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#1f7d50;">
          <strong>Verified.</strong> This top-up was confirmed by Nomba and reflected in your balance.
        </p>
      </div>
    </td>
  </tr>
</table>`;

  return emailLayout({
    title: `${amount} added to your Talli wallet`,
    preheader: `${amount} added — your new balance is ${balance}.`,
    body,
  });
}
