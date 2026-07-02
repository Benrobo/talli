
export const BRAND = {
  iris: "#6d4ae6",
  irisDeep: "#5636c4",
  irisSoft: "#eee9fc",
  ink: "#1b1830",
  muted: "#6b6880",
  faint: "#9c99b5",
  canvas: "#edecf3",
  card: "#ffffff",
  hairline: "#e7e5f0",
  emerald: "#2fa36b",
  emeraldSoft: "#e4f4ec",
  rose: "#e5484d",
  roseSoft: "#fce9ea",
  amber: "#d9902b",
  amberSoft: "#fbf0dd",
} as const;

const FONT =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

interface LayoutOptions {
  title: string;
  preheader?: string;
  body: string;
}

export function emailLayout({ title, preheader, body }: LayoutOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light only" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};">
${
  preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>`
    : ""
}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BRAND.canvas};padding:32px 12px;font-family:${FONT};">
  <tr>
    <td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:520px;">
        <tr>
          <td style="padding:0 4px 18px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="width:34px;height:34px;border-radius:10px;background:${BRAND.iris};text-align:center;line-height:34px;color:#ffffff;font-weight:800;font-size:16px;font-family:${FONT};">T</div>
                </td>
                <td style="vertical-align:middle;padding-left:10px;">
                  <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">Talli</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:${BRAND.card};border:1px solid ${BRAND.hairline};border-radius:20px;overflow:hidden;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 8px 0;text-align:center;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.faint};">
              Talli — the AI treasurer for money conversations in chat.<br />
              Secured by Nomba · Nigeria
            </p>
            <p style="margin:10px 0 0;font-size:12px;color:${BRAND.faint};">
              Questions? Just reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function heroBand(opts: { eyebrow?: string; big: string; sub?: string; tone?: "iris" | "emerald" | "rose" }): string {
  const bg =
    opts.tone === "emerald"
      ? "linear-gradient(160deg,#34b87d,#1f7d50)"
      : opts.tone === "rose"
        ? "linear-gradient(160deg,#ef6a6e,#c02d33)"
        : "linear-gradient(160deg,#7c5bf0,#5a38ce)";
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${bg};">
  <tr>
    <td style="padding:32px 32px 34px;">
      ${
        opts.eyebrow
          ? `<p style="margin:0 0 10px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.72);">${opts.eyebrow}</p>`
          : ""
      }
      <div style="font-size:40px;line-height:1;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">${opts.big}</div>
      ${opts.sub ? `<p style="margin:12px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${opts.sub}</p>` : ""}
    </td>
  </tr>
</table>`;
}

export function detailRow(label: string, value: string, opts?: { mono?: boolean; last?: boolean }): string {
  return `
<tr>
  <td style="padding:13px 0;${opts?.last ? "" : `border-bottom:1px solid ${BRAND.hairline};`}">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="font-size:13px;color:${BRAND.muted};">${label}</td>
        <td align="right" style="font-size:13.5px;font-weight:600;color:${BRAND.ink};${opts?.mono ? "font-family:'Roboto Mono',ui-monospace,monospace;font-size:12px;" : ""}">${value}</td>
      </tr>
    </table>
  </td>
</tr>`;
}

export function button(label: string, href: string): string {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="border-radius:12px;background:${BRAND.iris};">
      <a href="${href}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:${FONT};">${label}</a>
    </td>
  </tr>
</table>`;
}

export function pill(text: string, tone: "emerald" | "rose" | "amber" | "iris"): string {
  const map = {
    emerald: [BRAND.emeraldSoft, "#1f7d50"],
    rose: [BRAND.roseSoft, "#c02d33"],
    amber: [BRAND.amberSoft, "#a8681a"],
    iris: [BRAND.irisSoft, BRAND.irisDeep],
  }[tone];
  return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${map[0]};color:${map[1]};font-size:12px;font-weight:700;">${text}</span>`;
}
