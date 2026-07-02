import { createFileRoute, redirect } from "@tanstack/react-router";
import { meQueryOptions } from "@/api/http/v1/auth/auth.hooks";
import { JarPayPage } from "@/modules/savings/components/jar-pay-page";

export const Route = createFileRoute("/pay/jar/$id")({
  beforeLoad: async ({ context, location }) => {
    try {
      await context.queryClient.fetchQuery(meQueryOptions());
    } catch (err) {
      if (err instanceof Response || (err as { _isRedirect?: boolean })?._isRedirect) {
        throw err;
      }
      throw redirect({
        to: "/auth",
        search: { redirect: location.pathname },
      });
    }
  },
  component: JarPayPage,
});
