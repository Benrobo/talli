import { createFileRoute } from "@tanstack/react-router";
import { TransactionsPage } from "@/modules/transactions/components/transactions-page";

export const Route = createFileRoute("/app/transactions")({
  component: TransactionsPage,
});
