export type BillSplitStatus = "active" | "closed" | "expired";

export interface BillSplitSummary {
  id: string;
  token: string;
  title: string;
  totalMinor: number;
  itemCount: number;
  paidCount: number;
  status: BillSplitStatus;
  createdAt: string;
}

const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const billSplitHistory: BillSplitSummary[] = [
  {
    id: "bs_1",
    token: "d88fc7ef",
    title: "Dinner at Bukka",
    totalMinor: 24_500,
    itemCount: 6,
    paidCount: 0,
    status: "active",
    createdAt: minutesAgo(8),
  },
  {
    id: "bs_2",
    token: "a12be5fc",
    title: "Suya night",
    totalMinor: 15_000,
    itemCount: 5,
    paidCount: 0,
    status: "active",
    createdAt: minutesAgo(72),
  },
  {
    id: "bs_3",
    token: "9c04ff21",
    title: "Office lunch",
    totalMinor: 42_000,
    itemCount: 8,
    paidCount: 8,
    status: "closed",
    createdAt: minutesAgo(1440),
  },
];

const DELETE_WINDOW_MINUTES = 40;

export function canDeleteSplit(split: BillSplitSummary): boolean {
  if (split.paidCount > 0) return false;
  const ageMinutes = (Date.now() - new Date(split.createdAt).getTime()) / 60_000;
  return ageMinutes > DELETE_WINDOW_MINUTES;
}
