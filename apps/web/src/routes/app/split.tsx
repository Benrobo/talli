import { createFileRoute } from "@tanstack/react-router";
import { SplitPage } from "@/modules/bill-split/components/split-page";

export const Route = createFileRoute("/app/split")({
  component: SplitPage,
});
