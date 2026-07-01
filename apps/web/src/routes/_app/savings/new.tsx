import { createFileRoute } from "@tanstack/react-router";
import { CreateJarPage } from "@/modules/savings/components/create-jar-page";

export const Route = createFileRoute("/_app/savings/new")({
  component: CreateJarPage,
});
