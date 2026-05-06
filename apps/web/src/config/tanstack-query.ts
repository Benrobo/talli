import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient. Tuned for chat-style apps: stale data is acceptable
 * for 30s, GC after 5min idle, retry once on transient errors.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
