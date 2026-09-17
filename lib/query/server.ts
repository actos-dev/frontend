import "server-only";

import type { InfiniteData } from "@tanstack/react-query";
import { dehydrate, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/query/client";

export function makeServerQueryClient(): QueryClient {
  // A new cache per request prevents authenticated data from crossing users.
  return makeQueryClient();
}

export function seedInfinitePage<TPage, TPageParam>(
  client: QueryClient,
  queryKey: QueryKey,
  page: TPage,
  pageParam: TPageParam,
): void {
  client.setQueryData<InfiniteData<TPage, TPageParam>>(queryKey, {
    pages: [page],
    pageParams: [pageParam],
  });
}

export { dehydrate };
