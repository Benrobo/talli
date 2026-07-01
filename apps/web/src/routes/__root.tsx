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
  head: (ctx)=> {
    return  {
      meta: [
        {
          title: "Talli",
          description: "Talli is an AI-powered group treasurer that helps people collect, split, save, send, and track money directly inside their chats.",
        },
        {
          name: "description",
          content: "Talli is an AI-powered group treasurer that helps people collect, split, save, send, and track money directly inside their chats.",
        },
        {
          property: "og:title",
          content: "Talli",
        },
        {
          property: "og:description",
          content: "Talli is an AI-powered group treasurer that helps people collect, split, save, send, and track money directly inside their chats.",
        },
        {
          property: "og:image",
          content: "https://talli.benlabtest.space/og-image.png",
        },
        {
          property: "og:url",
          content: "https://talli.benlabtest.space",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "og:locale",
          content: "en_US",
        },
        {
          property: "og:site_name",
          content: "Talli",
        },
        {
          property: "og:image:width",
          content: "1200",
        },
        {
          property: "og:image:height",
          content: "630",
        },
        {
          property: "og:image:alt",
          content: "Talli is a platform for creating and managing collections.",
        },
      ]
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
