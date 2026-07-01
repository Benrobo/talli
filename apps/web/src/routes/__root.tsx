import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/auth";

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
      const user = await context.queryClient.fetchQuery({
        queryKey: ["me"],
        queryFn: authApi.me,
        staleTime: 5 * 60 * 1000,
      });
      return { user };
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
