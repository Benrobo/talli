import type { Transfer, TransfersSummary } from "@/modules/transfers/types";

export const transfers: Transfer[] = [
  {
    id: "t1",
    recipient: "Tunde A.",
    meta: "GTBank · away jersey",
    typed: '"send 5k to Tunde"',
    date: "Today",
    amountMinor: 500_000,
  },
  {
    id: "t2",
    recipient: "Mama",
    meta: "Opay · upkeep",
    typed: '"send mama 20k"',
    date: "Jun 19",
    amountMinor: 2_000_000,
  },
  {
    id: "t3",
    recipient: "Driver — Sola",
    meta: "Access · weekend trip",
    typed: '"pay Sola ₦3,500"',
    date: "Jun 14",
    amountMinor: 350_000,
  },
];

export const sentThisMonthMinor = 2_850_000;

/** Header roll-up for the money-sent ledger. */
export const transfersSummary: TransfersSummary = {
  sentThisMonthMinor,
  monthLabel: "June",
  transferCount: transfers.length,
  recipientCount: new Set(transfers.map((t) => t.recipient)).size,
};
