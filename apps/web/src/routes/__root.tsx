import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { meQueryOptions } from "@/api/http/v1/auth/auth.hooks";

function isProtectedPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ location, context }) => {
    if (!isProtectedPath(location.pathname)) return { user: null };

    try {
      const me = await context.queryClient.fetchQuery(meQueryOptions());
      return { user: me.data.user };
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
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <HeadContent />
      <Outlet />
    </>
  );
}
