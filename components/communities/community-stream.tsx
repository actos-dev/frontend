"use client";

import type { Post } from "actos";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/feed/post-card";
import { LoadMore } from "@/components/pagination/load-more";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { syncCursorToUrl } from "@/lib/pagination";
import { useSessionStore } from "@/lib/stores/session-store";
import { fetchVoteMapClient, type VoteMap } from "@/lib/votes";

export interface CommunityStreamProps {
  communityName: string;
  sort: "hot" | "new" | "top";
  initialPosts: Post[];
  initialNextCursor: string | null;
  /** The signed-in viewer's votes for `initialPosts`, keyed by post id (ROADMAP.md P0-06). */
  initialVotes?: VoteMap;
  initialViewerId?: string | null;
}

/**
 * A community's post list (`/c/[name]`). Same rendering as the feed and tag
 * streams; only the endpoint differs — the real 0.3.0 path is
 * `/api/communities/{name}/posts`, not a per-community feed.
 */
export function CommunityStream({
  communityName,
  sort,
  initialPosts,
  initialNextCursor,
  initialVotes,
  initialViewerId = null,
}: CommunityStreamProps) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [votes, setVotes] = useState<VoteMap>(initialVotes ?? {});
  const [votesPrincipalId, setVotesPrincipalId] = useState<string | null>(initialViewerId);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const authStatus = useSessionStore((state) => state.status);
  const sessionUserId = useSessionStore((state) => state.user?.id ?? null);
  const viewerId =
    authStatus === "authenticated"
      ? sessionUserId
      : authStatus === "unauthenticated"
        ? null
        : initialViewerId;

  useEffect(() => {
    setPosts(initialPosts);
    setNextCursor(initialNextCursor);
    setVotes(initialVotes ?? {});
    setVotesPrincipalId(initialViewerId);
  }, [initialPosts, initialNextCursor, initialVotes, initialViewerId]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !viewerId || votesPrincipalId === viewerId) return;
    let active = true;
    void fetchVoteMapClient(posts.map((post) => post.id))
      .then((nextVotes) => {
        if (!active || useSessionStore.getState().user?.id !== viewerId) return;
        setVotes(nextVotes);
        setVotesPrincipalId(viewerId);
      })
      .catch(() => {
        // Keep vote controls neutral until this viewer's state can be loaded.
      });
    return () => {
      active = false;
    };
  }, [authStatus, posts, viewerId, votesPrincipalId]);

  const handleLoadMore = async (cursor: string) => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams({ sort, limit: "25" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(
        `/api/communities/${encodeURIComponent(communityName)}/posts?${params.toString()}`,
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || t("communities.feed_load_more_error"));
        return;
      }

      const newItems: Post[] = data.items || [];
      setPosts((prev) => {
        const existing = new Set(prev.map((post) => post.id));
        return [...prev, ...newItems.filter((post) => !existing.has(post.id))];
      });
      setNextCursor(data.nextCursor ?? null);
      syncCursorToUrl(data.nextCursor ?? null, "push");

      if (authStatus === "authenticated" && newItems.length > 0) {
        const newVotes = await fetchVoteMapClient(newItems.map((post) => post.id));
        if (useSessionStore.getState().user?.id === viewerId) {
          setVotes((prev) => ({ ...prev, ...newVotes }));
          setVotesPrincipalId(viewerId);
        }
      }
    } catch {
      toast.error(t("communities.feed_load_more_error"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (posts.length === 0 && !isLoadingMore) {
    return (
      <div className="py-12 px-4 sm:px-6">
        <EmptyState
          icon={MessageSquarePlus}
          title={t("communities.feed_empty_title")}
          description={t("communities.feed_empty_description")}
          action={{ label: t("empty.feed_action"), href: "/new" }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40" data-testid="community-stream">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          initialUserVote={votesPrincipalId === viewerId ? (votes[post.id] ?? 0) : 0}
          initialViewerId={viewerId}
        />
      ))}

      <LoadMore
        nextCursor={nextCursor}
        onLoadMore={handleLoadMore}
        isLoading={isLoadingMore}
        label={t("communities.load_more")}
        loadingLabel={t("communities.loading")}
      />
    </div>
  );
}
