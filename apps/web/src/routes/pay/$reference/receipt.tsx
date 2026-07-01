import { createFileRoute } from "@tanstack/react-router";
import { PaymentReceiptPage } from "@/modules/payments/components/receipt-page";

export const Route = createFileRoute("/pay/$reference/receipt")({
  component: PaymentReceiptPage,
});
