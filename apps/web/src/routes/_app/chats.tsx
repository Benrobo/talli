import { createFileRoute } from "@tanstack/react-router";
import { ChatsPage } from "@/modules/chats/components/chats-page";

export const Route = createFileRoute("/_app/chats")({
  component: ChatsPage,
});
