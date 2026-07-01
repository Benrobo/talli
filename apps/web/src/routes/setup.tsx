import { createFileRoute } from "@tanstack/react-router";
import { ConnectPage } from "@/modules/chats/components/connect-page";

export const Route = createFileRoute("/setup")({
  component: ConnectPage,
});
