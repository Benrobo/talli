import type {
  PaymentReceipt,
  PaymentRequest,
} from "@/modules/payments/types";

export const paymentRequest: PaymentRequest = {
  reference: "TF-1024",
  purpose: "Saturday football pitch",
  amountMinor: 300_000,
  payingAs: "Tobi",
  payTo: "Benaiah FC",
  due: "Friday, Jun 26",
};

export const paymentReceipt: PaymentReceipt = {
  reference: "TF-1024",
  amountMinor: 300_000,
  purpose: "Saturday football pitch",
  from: "Tobi",
  to: "Benaiah FC",
  dateLabel: "Jun 22, 4:08 PM",
};
