import { infiniteQueryOptions } from "@tanstack/react-query";
import type { CommentNode, FeedSort, FeedWindow, Post } from "actos";
import type { InboxFilterTab } from "@/components/inbox/inbox-view";
import { readApiJson } from "@/lib/query/http";
import { type FeedFilters, type PrincipalId, queryKeys } from "@/lib/query/keys";
import type {
  CommentQueryPage,
  FeedQueryPage,
  InboxQueryPage,
  SavedQueryPage,
} from "@/lib/query/types";
import { fetchVoteMapClient, type VoteMap } from "@/lib/votes";

const PAGE_SIZE = 25;

export function feedQueryOptions(
  filters: FeedFilters,
  viewer: "anonymous" | "authenticated",
  principalId?: PrincipalId,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.feeds.list(filters, viewer, principalId),
    initialPageParam: filters.initialCursor ?? null,
    queryFn: ({ pageParam, signal }) => fetchFeedPage(filters, viewer, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

async function fetchFeedPage(
  filters: FeedFilters,
  viewer: "anonymous" | "authenticated",
  cursor: string | null,
  signal?: AbortSignal,
): Promise<FeedQueryPage> {
  const params = new URLSearchParams({ sort: filters.sort, limit: String(PAGE_SIZE) });
  if (filters.window) params.set("window", filters.window);
  if (filters.actorType) params.set("actor_type", filters.actorType);
  if (cursor) params.set("cursor", cursor);

  const endpoint = filters.following ? "/api/feed/following" : "/api/feed";
  const response = await fetch(`${endpoint}?${params}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const data = await readApiJson<{
    items: Post[];
    nextCursor: string | null;
  }>(response);
  const votes: VoteMap =
    viewer === "authenticated" && data.items.length > 0
      ? await fetchVoteMapClient(data.items.map((post) => post.id))
      : {};

  return { ...data, votes };
}

export function commentQueryOptions(postId: string, sort: "top" | "new", initialCursor?: string) {
  return infiniteQueryOptions({
    queryKey: queryKeys.comments.list(postId, sort, initialCursor),
    initialPageParam: initialCursor ?? null,
    queryFn: ({ pageParam, signal }) => fetchCommentPage(postId, sort, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

async function fetchCommentPage(
  postId: string,
  sort: "top" | "new",
  cursor: string | null,
  signal?: AbortSignal,
): Promise<CommentQueryPage> {
  const params = new URLSearchParams({ postId, sort, limit: String(PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/comments?${params}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const data = await readApiJson<{
    data: CommentNode[];
    nextCursor: string | null;
  }>(response);
  return { items: data.data, nextCursor: data.nextCursor ?? null };
}

export function inboxQueryOptions(
  filter: InboxFilterTab,
  initialCursor?: string,
  principalId?: PrincipalId,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.inbox.list(filter, initialCursor, principalId),
    initialPageParam: initialCursor ?? null,
    queryFn: ({ pageParam, signal }) => fetchInboxPage(filter, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function savedQueryOptions(initialCursor?: string, principalId?: PrincipalId) {
  return infiniteQueryOptions({
    queryKey: queryKeys.saved.list(initialCursor, principalId),
    initialPageParam: initialCursor ?? null,
    queryFn: ({ pageParam, signal }) => fetchSavedPage(pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

async function fetchSavedPage(
  cursor: string | null,
  signal?: AbortSignal,
): Promise<SavedQueryPage> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/saved?${params}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const data = await readApiJson<{ items: Post[]; nextCursor?: string | null }>(response);
  const votes =
    data.items.length > 0 ? await fetchVoteMapClient(data.items.map((post) => post.id)) : {};
  return { items: data.items, nextCursor: data.nextCursor ?? null, votes };
}

async function fetchInboxPage(
  filter: InboxFilterTab,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<InboxQueryPage> {
  const params = new URLSearchParams({ filter, limit: String(PAGE_SIZE) });
  if (filter === "unread") params.set("unread", "true");
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/inbox?${params}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const data = await readApiJson<{
    notifications: InboxQueryPage["notifications"];
    nextCursor?: string | null;
    unreadCount?: number;
  }>(response);
  return {
    notifications: data.notifications ?? [],
    nextCursor: data.nextCursor ?? null,
    unreadCount: data.unreadCount ?? 0,
  };
}

export function normalizeFeedFilters(input: {
  sort?: string;
  window?: string;
  actorType?: string;
  following?: boolean;
  initialCursor?: string;
}): FeedFilters {
  const sort = input.following ? "new" : (input.sort ?? "hot");
  return {
    sort,
    window: sort === "top" ? input.window : undefined,
    actorType: input.actorType,
    following: input.following ?? false,
    initialCursor: input.initialCursor,
  };
}

export function toFeedSort(sort: string): FeedSort {
  return sort as FeedSort;
}

export function toFeedWindow(window: string): FeedWindow {
  return window as FeedWindow;
}
