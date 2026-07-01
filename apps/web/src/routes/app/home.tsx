import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/modules/dashboard/components/home-page";

export const Route = createFileRoute("/app/home")({
  component: HomePage,
});
