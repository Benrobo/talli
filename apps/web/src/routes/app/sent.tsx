import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/sent")({
  beforeLoad: () => {
    throw redirect({ to: "/app/transactions" });
  },
});
