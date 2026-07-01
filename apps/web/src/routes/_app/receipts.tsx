import { createFileRoute } from "@tanstack/react-router";
import { ReceiptsPage } from "@/modules/receipts/components/receipts-page";

export const Route = createFileRoute("/_app/receipts")({
  component: ReceiptsPage,
});
