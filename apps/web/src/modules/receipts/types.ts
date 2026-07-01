export type ReceiptKind = "collection" | "send" | "savings";

export type ReceiptLink =
  | { to: "/pay/$reference/receipt"; params: { reference: string } }
  | { to: "/sent" }
  | { to: "/savings/$id"; params: { id: string } };

export interface Receipt {
  ref: string;
  title: string;
  detail: string;
  date: string;
  amountMinor: number;
  kind: ReceiptKind;
  link: ReceiptLink;
}

export interface ReceiptsSummary {
  count: number;
  totalMinor: number;
}
