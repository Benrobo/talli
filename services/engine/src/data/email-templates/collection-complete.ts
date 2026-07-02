import { BRAND, detailRow, emailLayout, heroBand, pill } from "./layout.js";

interface CollectionCompleteProps {
  ownerName: string;
  title: string;
  totalCollected: number;
  memberCount: number;
}

export function generateCollectionCompleteHtml(props: CollectionCompleteProps): string {
  const total = `₦${props.totalCollected.toLocaleString("en-NG")}`;
  const firstName = props.ownerName.split(" ")[0] || props.ownerName;
  const people = props.memberCount === 1 ? "1 person" : `${props.memberCount} people`;

  const body = `
${heroBand({ eyebrow: "COLLECTION COMPLETE", big: total, sub: `raised for ${props.title}`, tone: "iris" })}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td style="padding:26px 32px 8px;">
      ${pill("🎉 All in", "iris")}
      <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">
        That's a wrap, ${firstName}! <strong>${props.title}</strong> is fully funded — ${people} paid up and the target is met. Nice work rallying everyone.
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:6px 32px 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${detailRow("Collection", props.title)}
        ${detailRow("Contributors", people)}
        ${detailRow("Total collected", total, { last: true })}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:22px 32px 30px;">
      <div style="padding:14px 16px;border-radius:12px;background:${BRAND.irisSoft};">
        <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.irisDeep};">
          The full ${total} is sitting in your Talli wallet, ready whenever you need it.
        </p>
      </div>
    </td>
  </tr>
</table>`;

  return emailLayout({
    title: `${props.title} is fully funded — ${total} raised`,
    preheader: `${props.title} hit its target — ${total} collected from ${people}.`,
    body,
  });
}
