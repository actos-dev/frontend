"use client";

import {
  type InfiniteData,
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { CommentNode } from "actos";
import { useEffect } from "react";
import { readApiJson } from "@/lib/query/http";
import { queryKeys } from "@/lib/query/keys";
import type {
  CommentQueryPage,
  ContentInteraction,
  FeedQueryPage,
  SavedQueryPage,
} from "@/lib/query/types";

type FeedCache = InfiniteData<FeedQueryPage, string | null>;
type CommentCache = InfiniteData<CommentQueryPage, string | null>;
type SavedCache = InfiniteData<SavedQueryPage, string | null>;
type Snapshot<T> = Array<[QueryKey, T | undefined]>;
type ScoreSnapshot = Array<[QueryKey, number]>;

function mapCommentTree(
  nodes: CommentNode[],
  commentId: string,
  update: (node: CommentNode) => CommentNode,
): CommentNode[] {
  return nodes.map((node) => {
    if (node.id === commentId) return update(node);
    if (!node.replies?.length) return node;
    return { ...node, replies: mapCommentTree(node.replies, commentId, update) };
  });
}

function updatePostScore(cache: FeedCache | SavedCache, contentId: string, score: number) {
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      items: page.items.map((post) => (post.id === contentId ? { ...post, score } : post)),
    })),
  } as typeof cache;
}

function updateCommentScore(cache: CommentCache, contentId: string, score: number): CommentCache {
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      items: mapCommentTree(page.items, contentId, (comment) => ({ ...comment, score })),
    })),
  };
}

function postScore(cache: FeedCache | SavedCache, contentId: string): number | undefined {
  for (const page of cache.pages) {
    const post = page.items.find((item) => item.id === contentId);
    if (post) return post.score;
  }
  return undefined;
}

function commentScore(nodes: CommentNode[], contentId: string): number | undefined {
  for (const node of nodes) {
    if (node.id === contentId) return node.score;
    const replyScore = node.replies?.length ? commentScore(node.replies, contentId) : undefined;
    if (replyScore !== undefined) return replyScore;
  }
  return undefined;
}

function captureScores<T>(
  snapshots: Snapshot<T>,
  contentId: string,
  getScore: (cache: T, contentId: string) => number | undefined,
): ScoreSnapshot {
  const scores: ScoreSnapshot = [];
  for (const [key, cache] of snapshots) {
    if (!cache) continue;
    const score = getScore(cache, contentId);
    if (score !== undefined) scores.push([key, score]);
  }
  return scores;
}

function restorePostScores<T extends FeedCache | SavedCache>(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: ScoreSnapshot,
  contentId: string,
  update: (cache: T, contentId: string, score: number) => T,
) {
  for (const [key, score] of snapshots) {
    const current = queryClient.getQueryData<T>(key);
    if (current && postScore(current, contentId) !== undefined) {
      queryClient.setQueryData(key, update(current, contentId, score));
    }
  }
}

function restoreSnapshots<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot: Snapshot<T>,
) {
  for (const [key, data] of snapshot) {
    if (data !== undefined) queryClient.setQueryData(key, data);
  }
}

function belongsToPrincipalFeed(queryKey: QueryKey, principalId: string | null): boolean {
  if (queryKey[0] !== "feeds" || queryKey[1] !== "list") return false;
  if (queryKey[3] === "anonymous") return principalId === null;
  return queryKey[3] === "authenticated" && queryKey[4] === principalId;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readApiJson<T>(response);
}

async function deleteRequest(url: string): Promise<void> {
  const response = await fetch(url, { method: "DELETE", credentials: "same-origin" });
  await readApiJson<{ ok: true }>(response);
}

export function useContentInteraction(
  contentId: string,
  initial: { score: number; userVote: -1 | 0 | 1; saved?: boolean },
  principalId: string | null = null,
) {
  const queryClient = useQueryClient();
  const initialInteraction: ContentInteraction = {
    score: initial.score,
    userVote: initial.userVote,
    saved: initial.saved ?? null,
  };
  const interactionQuery = useQuery<ContentInteraction>({
    queryKey: queryKeys.interactions.content(contentId, principalId),
    queryFn: async () => ({ score: initial.score, userVote: initial.userVote, saved: null }),
    enabled: false,
    initialData: () => initialInteraction,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const interaction = interactionQuery.data ?? initialInteraction;

  useEffect(() => {
    if (initial.saved === undefined) return;
    queryClient.setQueryData<ContentInteraction>(
      queryKeys.interactions.content(contentId, principalId),
      (current) =>
        current && current.saved === null ? { ...current, saved: initial.saved ?? false } : current,
    );
  }, [contentId, initial.saved, principalId, queryClient]);

  const voteMutation = useMutation({
    mutationFn: async (nextVote: -1 | 0 | 1) => {
      const data = await postJson<{ data?: { score?: number } }>("/api/actions/vote", {
        contentId,
        value: nextVote,
      });
      return { nextVote, score: data.data?.score };
    },
    onMutate: async (nextVote) => {
      const interactionKey = queryKeys.interactions.content(contentId, principalId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: interactionKey }),
        queryClient.cancelQueries({
          queryKey: queryKeys.feeds.all,
          predicate: (query) => belongsToPrincipalFeed(query.queryKey, principalId),
        }),
        queryClient.cancelQueries({ queryKey: queryKeys.comments.all }),
        queryClient.cancelQueries({
          queryKey: queryKeys.saved.all,
          predicate: (query) => query.queryKey[2] === (principalId ?? "anonymous"),
        }),
      ]);
      const previousInteraction = queryClient.getQueryData<ContentInteraction>(interactionKey);
      const current = previousInteraction ?? interaction ?? initialInteraction;
      const nextScore = current.score + nextVote - current.userVote;
      const feedSnapshot = queryClient.getQueriesData<FeedCache>({
        queryKey: queryKeys.feeds.all,
        predicate: (query) => belongsToPrincipalFeed(query.queryKey, principalId),
      });
      const commentSnapshot = queryClient.getQueriesData<CommentCache>({
        queryKey: queryKeys.comments.all,
      });
      const savedSnapshot = queryClient.getQueriesData<SavedCache>({
        queryKey: queryKeys.saved.all,
        predicate: (query) => query.queryKey[2] === (principalId ?? "anonymous"),
      });
      const feedScoreSnapshot = captureScores(feedSnapshot, contentId, postScore);
      const commentScoreSnapshot = captureScores(commentSnapshot, contentId, (cache, id) => {
        for (const page of cache.pages) {
          const score = commentScore(page.items, id);
          if (score !== undefined) return score;
        }
        return undefined;
      });
      const savedScoreSnapshot = captureScores(savedSnapshot, contentId, postScore);

      queryClient.setQueryData<ContentInteraction>(interactionKey, {
        ...current,
        userVote: nextVote,
        score: nextScore,
      });
      for (const [key, cache] of feedSnapshot) {
        if (cache) queryClient.setQueryData(key, updatePostScore(cache, contentId, nextScore));
      }
      for (const [key, cache] of commentSnapshot) {
        if (cache) queryClient.setQueryData(key, updateCommentScore(cache, contentId, nextScore));
      }
      for (const [key, cache] of savedSnapshot) {
        if (cache) queryClient.setQueryData(key, updatePostScore(cache, contentId, nextScore));
      }

      return {
        previousInteraction,
        feedScoreSnapshot,
        commentScoreSnapshot,
        savedScoreSnapshot,
      };
    },
    onError: (_error, _targetVote, context) => {
      if (!context) return;
      const key = queryKeys.interactions.content(contentId, principalId);
      if (context.previousInteraction) queryClient.setQueryData(key, context.previousInteraction);
      else queryClient.removeQueries({ queryKey: key, exact: true });
      restorePostScores<FeedCache>(
        queryClient,
        context.feedScoreSnapshot,
        contentId,
        updatePostScore,
      );
      for (const [cacheKey, score] of context.commentScoreSnapshot) {
        const current = queryClient.getQueryData<CommentCache>(cacheKey);
        if (!current) continue;
        queryClient.setQueryData(cacheKey, updateCommentScore(current, contentId, score));
      }
      restorePostScores<SavedCache>(
        queryClient,
        context.savedScoreSnapshot,
        contentId,
        updatePostScore,
      );
    },
    onSuccess: ({ nextVote, score }) => {
      if (score === undefined) return;
      const key = queryKeys.interactions.content(contentId, principalId);
      queryClient.setQueryData<ContentInteraction>(key, (current) =>
        current ? { ...current, userVote: nextVote, score } : current,
      );
      for (const [cacheKey, cache] of queryClient.getQueriesData<FeedCache>({
        queryKey: queryKeys.feeds.all,
      })) {
        if (cache) queryClient.setQueryData(cacheKey, updatePostScore(cache, contentId, score));
      }
      for (const [cacheKey, cache] of queryClient.getQueriesData<CommentCache>({
        queryKey: queryKeys.comments.all,
      })) {
        if (cache) queryClient.setQueryData(cacheKey, updateCommentScore(cache, contentId, score));
      }
      for (const [cacheKey, cache] of queryClient.getQueriesData<SavedCache>({
        queryKey: queryKeys.saved.all,
      })) {
        if (cache) queryClient.setQueryData(cacheKey, updatePostScore(cache, contentId, score));
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (nextSaved: boolean) => {
      await postJson<{ saved: boolean }>("/api/actions/save", {
        contentId,
        action: nextSaved ? "add" : "remove",
      });
      return nextSaved;
    },
    onMutate: async (nextSaved) => {
      const interactionKey = queryKeys.interactions.content(contentId, principalId);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: interactionKey }),
        queryClient.cancelQueries({
          queryKey: queryKeys.saved.all,
          predicate: (query) => query.queryKey[2] === (principalId ?? "anonymous"),
        }),
      ]);
      const previousInteraction = queryClient.getQueryData<ContentInteraction>(interactionKey);
      const current = previousInteraction ?? interaction ?? initialInteraction;
      const savedSnapshot = queryClient.getQueriesData<SavedCache>({
        queryKey: queryKeys.saved.all,
        predicate: (query) => query.queryKey[2] === (principalId ?? "anonymous"),
      });
      queryClient.setQueryData<ContentInteraction>(interactionKey, {
        ...current,
        saved: nextSaved,
      });
      if (!nextSaved) {
        for (const [key, cache] of savedSnapshot) {
          if (!cache) continue;
          queryClient.setQueryData<SavedCache>(key, {
            ...cache,
            pages: cache.pages.map((page) => ({
              ...page,
              items: page.items.filter((post) => post.id !== contentId),
            })),
          });
        }
      }
      return { previousInteraction, savedSnapshot };
    },
    onError: (_error, _nextSaved, context) => {
      if (!context) return;
      const key = queryKeys.interactions.content(contentId, principalId);
      if (context.previousInteraction) queryClient.setQueryData(key, context.previousInteraction);
      else queryClient.removeQueries({ queryKey: key, exact: true });
      restoreSnapshots(queryClient, context.savedSnapshot);
    },
  });

  return {
    score: interaction.score,
    userVote: interaction.userVote,
    saved: interaction.saved,
    isVoting: voteMutation.isPending,
    isSaving: saveMutation.isPending,
    vote: (targetVote: 1 | -1) => {
      const current =
        queryClient.getQueryData<ContentInteraction>(
          queryKeys.interactions.content(contentId, principalId),
        ) ??
        interaction ??
        initialInteraction;
      return voteMutation.mutateAsync(current.userVote === targetVote ? 0 : targetVote);
    },
    save: (nextSaved: boolean) => saveMutation.mutateAsync(nextSaved),
  };
}

export function useFollowMutation(
  username: string,
  initialFollowing = false,
  principalId: string | null = null,
) {
  const queryClient = useQueryClient();
  const key = queryKeys.interactions.follow(username, principalId);
  const query = useQuery({
    queryKey: key,
    queryFn: async () => initialFollowing,
    enabled: false,
    initialData: initialFollowing,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const mutation = useMutation({
    mutationFn: async (nextFollowing: boolean) => {
      const data = await postJson<{ following: boolean }>("/api/actions/follow", {
        username,
        action: nextFollowing ? "follow" : "unfollow",
      });
      return data.following;
    },
    onMutate: async (nextFollowing) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<boolean>(key);
      queryClient.setQueryData(key, nextFollowing);
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(key, context.previous);
    },
  });
  return {
    following: query.data,
    isPending: mutation.isPending,
    toggle: (nextFollowing: boolean) => mutation.mutateAsync(nextFollowing),
  };
}

export function useDeletePostMutation(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteRequest(`/api/posts/${encodeURIComponent(postId)}`),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.feeds.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.saved.all }),
      ]);
      const feedSnapshot = queryClient.getQueriesData<FeedCache>({ queryKey: queryKeys.feeds.all });
      const savedSnapshot = queryClient.getQueriesData<SavedCache>({
        queryKey: queryKeys.saved.all,
      });
      for (const [key, cache] of feedSnapshot) {
        if (!cache) continue;
        queryClient.setQueryData<FeedCache>(key, {
          ...cache,
          pages: cache.pages.map((page) => ({
            ...page,
            items: page.items.filter((post) => post.id !== postId),
          })),
        });
      }
      for (const [key, cache] of savedSnapshot) {
        if (!cache) continue;
        queryClient.setQueryData<SavedCache>(key, {
          ...cache,
          pages: cache.pages.map((page) => ({
            ...page,
            items: page.items.filter((post) => post.id !== postId),
          })),
        });
      }
      return { feedSnapshot, savedSnapshot };
    },
    onError: (_error, _postId, context) => {
      if (!context) return;
      restoreSnapshots(queryClient, context.feedSnapshot);
      restoreSnapshots(queryClient, context.savedSnapshot);
    },
  });
}

export function useDeleteCommentMutation(postId: string, commentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteRequest(`/api/comments/${encodeURIComponent(commentId)}`),
    onMutate: async (deletedBody: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.comments.all });
      const snapshots = queryClient.getQueriesData<CommentCache>({
        queryKey: queryKeys.comments.all,
      });
      for (const [key, cache] of snapshots) {
        if (!cache || key[2] !== postId) continue;
        queryClient.setQueryData<CommentCache>(key, {
          ...cache,
          pages: cache.pages.map((page) => ({
            ...page,
            items: mapCommentTree(page.items, commentId, (node) => ({
              ...node,
              deleted: true,
              authorDeleted: true,
              body: deletedBody,
              bodyHtml: `<p>${deletedBody}</p>`,
            })),
          })),
        });
      }
      return { snapshots };
    },
    onError: (_error, _body, context) => {
      if (context) restoreSnapshots(queryClient, context.snapshots);
    },
  });
}
