import { createFileRoute } from "@tanstack/react-router";
import { SentPage } from "@/modules/transfers/components/sent-page";

export const Route = createFileRoute("/app/sent")({
  component: SentPage,
});
