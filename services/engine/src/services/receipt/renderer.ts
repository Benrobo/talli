import satori from "satori";
import sharp from "sharp";
import env from "../../config/env.js";
import logger from "../../lib/logger.js";
import { receiptFontManager } from "./font-manager.js";

type Node = { type: string; props: Record<string, unknown> };

function h(type: string, style: Record<string, unknown>, children?: unknown): Node {
  return { type, props: { style, ...(children !== undefined ? { children } : {}) } };
}

function img(src: string, style: Record<string, unknown>): Node {
  return { type: "img", props: { src, style } };
}

function svg(svgString: string, size = 20): Node {
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgString).toString("base64")}`;
  return { type: "img", props: { src: dataUri, width: size, height: size, style: { display: "flex" } } };
}

function naira(color: string, size: number): Node {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><g fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"><path d="M5 21V3l14 18V3"/><path d="M3 9h18M3 15h18"/></g></svg>`;
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(markup).toString("base64")}`;
  return { type: "img", props: { src: dataUri, width: size, height: size, style: { display: "flex" } } };
}


let logoDataUri: string | null = null;

/**
 * Fetches the brand logo from its public URL once and caches it as a data URI, so
 * satori renders self-contained (no per-receipt network call) and the receipt
 * never depends on a file bundled into the container. A failed fetch is left
 * uncached (logoDataUri stays null) so the NEXT receipt retries — the current one
 * renders without the logo rather than being poisoned into never showing it again.
 */
async function ensureLogo(): Promise<void> {
  if (logoDataUri) return;
  try {
    const res = await fetch(env.BRAND_LOGO_URL);
    if (!res.ok) throw new Error(`logo fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    logoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  } catch (err) {
    logger.warn(`[receipt] logo fetch failed, rendering without it: ${(err as Error).message}`);
  }
}

function logo(): string {
  return logoDataUri ?? "";
}

const COLORS = {
  primary: "#6449da",
  primaryDeep: "#4d31b3",
  ink: "#191726",
  muted: "#6e6b86",
  tint: "#f1edfb",
  tintDeep: "#452aa2",
  badgeGreen: "#1c8a5a",
  lilac: "#cdc2f6",
  lilacSoft: "#c4b8f5",
  lilacBright: "#d7ccfb",
  divider: "#f1eef8",
};

const ICON = {
  check: (fill: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"><path d="M1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25C6.06294 1.25 1.25 6.06294 1.25 12ZM16.6757 8.26285C17.0828 8.63604 17.1103 9.26861 16.7372 9.67573L11.2372 15.6757C11.0528 15.8768 10.7944 15.9938 10.5217 15.9998C10.249 16.0057 9.98576 15.9 9.79289 15.7071L7.29289 13.2071C6.90237 12.8166 6.90237 12.1834 7.29289 11.7929C7.68342 11.4024 8.31658 11.4024 8.70711 11.7929L10.4686 13.5544L15.2628 8.32428C15.636 7.91716 16.2686 7.88966 16.6757 8.26285Z" fill="${fill}"/></svg>`,
  from: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#6449da"><path d="M14 7a4 4 0 11-8 0 4 4 0 018 0zM3 20a7 7 0 0114 0v.5H3V20z"/></svg>`,
  to: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6449da" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.6" fill="#6449da"/></svg>`,
  date: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6449da" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/></svg>`,
  ref: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6449da" stroke-width="1.8" stroke-linecap="round"><path d="M9 3L7 21M17 3l-2 18M4 8h16M3 16h16"/></svg>`,
};

export interface ReceiptRow {
  icon: "from" | "to" | "date" | "ref";
  label: string;
  value: string;
  mono?: boolean;
}

export interface ReceiptData {
  amount: string;
  purpose: string;
  highlight: string;
  rows: ReceiptRow[];
}

function detailRow(row: ReceiptRow, withDivider: boolean): Node[] {
  const valueNode = row.mono
    ? h(
        "div",
        {
          display: "flex",
          fontFamily: "Space Mono",
          fontSize: 16,
          color: COLORS.tintDeep,
          fontWeight: 700,
          background: COLORS.tint,
          borderRadius: 8,
          padding: "6px 12px",
        },
        row.value
      )
    : h("div", { display: "flex", fontSize: 19, color: COLORS.ink, fontWeight: 700 }, row.value);

  const node = h(
    "div",
    {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "15px 0",
    },
    [
      h("div", { display: "flex", flexDirection: "row", alignItems: "center" }, [
        h(
          "div",
          {
            display: "flex",
            width: 42,
            height: 42,
            borderRadius: 13,
            marginRight: 16,
            background: COLORS.tint,
            alignItems: "center",
            justifyContent: "center",
          },
          svg(ICON[row.icon])
        ),
        h("div", { display: "flex", fontSize: 17, color: COLORS.muted, fontWeight: 500 }, row.label),
      ]),
      valueNode,
    ]
  );

  if (!withDivider) return [node];
  return [node, h("div", { display: "flex", height: 1, background: COLORS.divider, margin: "4px 0" })];
}

function buildTree(data: ReceiptData): Node {
  const header = h(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      padding: "46px 52px 44px 52px",
      color: "#ffffff",
      backgroundImage: `linear-gradient(140deg, ${COLORS.primary} 0%, ${COLORS.primaryDeep} 100%)`,
    },
    [
      h(
        "div",
        { display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        [
          h("div", { display: "flex", flexDirection: "row", alignItems: "center" }, [
            ...(logo() ? [img(logo(), { width: 52, height: 52, marginRight: 14, borderRadius: 10 })] : []),
            h("div", { display: "flex", flexDirection: "column" }, [
              h("div", { display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }, "Talli"),
              h(
                "div",
                { display: "flex", fontSize: 12, fontWeight: 600, letterSpacing: 2.5, color: COLORS.lilac, marginTop: 5 },
                "AI TREASURER"
              ),
            ]),
          ]),
          h(
            "div",
            {
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              background: "#ffffff",
              borderRadius: 999,
              padding: "8px 16px 8px 11px",
              fontSize: 15,
              fontWeight: 700,
              color: COLORS.badgeGreen,
            },
            [h("div", { display: "flex", marginRight: 7 }, svg(ICON.check(COLORS.badgeGreen))), "Successful"]
          ),
        ]
      ),
      h("div", { display: "flex", flexDirection: "column", marginTop: 40 }, [
        h(
          "div",
          { display: "flex", fontSize: 12, fontWeight: 700, letterSpacing: 3.5, color: COLORS.lilacSoft },
          "PAYMENT RECEIPT"
        ),
        h("div", { display: "flex", flexDirection: "row", alignItems: "flex-start", marginTop: 10 }, [
          h(
            "div",
            { display: "flex", marginTop: 18, marginRight: 10 },
            naira(COLORS.lilacBright, 30)
          ),
          h("div", { display: "flex", fontSize: 82, fontWeight: 800, letterSpacing: -3, lineHeight: 0.9 }, data.amount),
        ]),
        h(
          "div",
          { display: "flex", flexDirection: "row", alignItems: "center", marginTop: 16, fontSize: 18, fontWeight: 500, color: "#e7e1fb" },
          [
            `${data.purpose} ·`,
            h("div", { display: "flex", color: "#ffffff", fontWeight: 600, marginLeft: 6 }, data.highlight),
          ]
        ),
      ]),
    ]
  );

  const perf = h(
    "div",
    { display: "flex", flexDirection: "row", alignItems: "center", height: 40, background: "#ffffff" },
    [
      h("div", { display: "flex", width: 40, height: 40, borderRadius: 999, background: "#0b0d12", marginLeft: -20 }),
      h("div", {
        display: "flex",
        flex: 1,
        height: 3,
        margin: "0 10px",
        backgroundImage:
          "repeating-linear-gradient(90deg, #d4ccec 0px, #d4ccec 7px, rgba(0,0,0,0) 7px, rgba(0,0,0,0) 16px)",
      }),
      h("div", { display: "flex", width: 40, height: 40, borderRadius: 999, background: "#0b0d12", marginRight: -20 }),
    ]
  );

  const rows: Node[] = [];
  data.rows.forEach((row, i) => {
    rows.push(...detailRow(row, i < data.rows.length - 1));
  });
  const body = h("div", { display: "flex", flexDirection: "column", padding: "34px 52px 44px 52px" }, rows);

  const footer = h(
    "div",
    {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "22px 52px 28px 52px",
      borderTop: `1px solid ${COLORS.divider}`,
    },
    [
      h("div", { display: "flex", flexDirection: "column" }, [
        h("div", { display: "flex", fontSize: 15, color: COLORS.ink, fontWeight: 600 }, "Thank you for using Talli"),
        h("div", { display: "flex", fontSize: 13, color: "#8480a0", marginTop: 3 }, "trytalli.app"),
      ]),
      h(
        "div",
        { display: "flex", flexDirection: "row", alignItems: "center", fontSize: 13, fontWeight: 700, color: COLORS.primary, letterSpacing: 0.3 },
        [h("div", { display: "flex", marginRight: 6 }, svg(ICON.check(COLORS.primary))), "VERIFIED"]
      ),
    ]
  );

  return h(
    "div",
    { display: "flex", flexDirection: "column", width: 720, background: "#ffffff", fontFamily: "Sora" },
    [header, perf, body, footer]
  );
}

export async function renderReceipt(data: ReceiptData): Promise<Buffer> {
  const [, fonts] = await Promise.all([ensureLogo(), receiptFontManager.getFonts()]);
  if (fonts.length === 0) {
    throw new Error("receipt fonts unavailable — could not load any font to render");
  }
  const tree = buildTree(data);
  const svgOut = await satori(tree as never, { width: 720, fonts: fonts as never });
  return sharp(Buffer.from(svgOut)).png({ compressionLevel: 8 }).toBuffer();
}
