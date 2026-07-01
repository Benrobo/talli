export type PayMethod = "bank" | "card" | "ussd";

export interface PaymentRequest {
  reference: string;
  purpose: string;
  amountMinor: number;
  payingAs: string;
  payTo: string;
  due: string;
}

export interface PaymentReceipt {
  reference: string;
  amountMinor: number;
  purpose: string;
  from: string;
  to: string;
  dateLabel: string;
}
