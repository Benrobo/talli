import { createFileRoute } from "@tanstack/react-router";
import { SavingsPage } from "@/modules/savings/components/savings-page";

export const Route = createFileRoute("/app/savings/")({
  component: SavingsPage,
});
