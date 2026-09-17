import { QueryClient } from "@tanstack/react-query";

/**
 * Client-side data deliberately outlives a route transition so returning to a
 * feed restores every cursor page already loaded in this browser session.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
