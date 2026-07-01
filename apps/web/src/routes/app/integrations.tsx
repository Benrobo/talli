import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsPage } from "@/modules/chats/components/integrations-page";

export const Route = createFileRoute("/app/integrations")({
  component: IntegrationsPage,
});
