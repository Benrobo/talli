import { createFileRoute } from "@tanstack/react-router";
import { PayPage } from "@/modules/payments/components/pay-page";

export const Route = createFileRoute("/pay/$reference/")({
  component: PayPage,
});
