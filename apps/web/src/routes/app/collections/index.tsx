import { createFileRoute } from "@tanstack/react-router";
import { CollectionsPage } from "@/modules/collections/components/collections-page";

export const Route = createFileRoute("/app/collections/")({
  component: CollectionsPage,
});
