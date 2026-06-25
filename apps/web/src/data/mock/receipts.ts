import type { Receipt } from "@/modules/receipts/types";

export const receipts: Receipt[] = [
  {
    ref: "TF-1024",
    title: "Saturday football pitch",
    detail: "Collection payment · Tobi",
    date: "Jun 22",
    amountMinor: 300_000,
    link: { to: "/pay/$reference/receipt", params: { reference: "TF-1024" } },
  },
  {
    ref: "TF-1019",
    title: "Transfer to Tunde A.",
    detail: "Send · away jersey",
    date: "Jun 22",
    amountMinor: 500_000,
    link: { to: "/sent" },
  },
  {
    ref: "TF-1011",
    title: "Rent Jar deposit",
    detail: "Savings · from chat",
    date: "Jun 22",
    amountMinor: 200_000,
    link: { to: "/savings/$id", params: { id: "rent" } },
  },
  {
    ref: "TF-0987",
    title: "Transfer to Mama",
    detail: "Send · upkeep",
    date: "Jun 19",
    amountMinor: 2_000_000,
    link: { to: "/sent" },
  },
];
