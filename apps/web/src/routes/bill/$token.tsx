import { createFileRoute } from "@tanstack/react-router";
import { BillSplitPage } from "@/modules/bill-split/components/bill-split-page";

export const Route = createFileRoute("/bill/$token")({
  component: BillSplitPage,
});
