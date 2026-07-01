import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
