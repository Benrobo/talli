import { createFileRoute } from "@tanstack/react-router";
import { SentPage } from "@/modules/transfers/components/sent-page";

export const Route = createFileRoute("/_app/sent")({
  component: SentPage,
});
