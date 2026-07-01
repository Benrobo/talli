import { createFileRoute } from "@tanstack/react-router";
import { ReceiptsPage } from "@/modules/receipts/components/receipts-page";

export const Route = createFileRoute("/app/receipts")({
  component: ReceiptsPage,
});
