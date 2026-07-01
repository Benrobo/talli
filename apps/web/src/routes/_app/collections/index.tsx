import { createFileRoute } from "@tanstack/react-router";
import { CollectionsPage } from "@/modules/collections/components/collections-page";

export const Route = createFileRoute("/_app/collections/")({
  component: CollectionsPage,
});
