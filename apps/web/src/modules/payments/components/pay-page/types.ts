export type PayStage =
  | "pick"
  | "pay-name"
  | "pay-amount"
  | "pay"
  | "verifying"
  | "failed"
  | "done";

export interface PendingCheckout {
  memberId?: string;
  payerName?: string;
}

export interface CheckoutPayload {
  memberId?: string;
  payerName?: string;
  amount?: number;
}
