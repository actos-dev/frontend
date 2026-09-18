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

export interface TagStreamProps {
  tagName: string;
  sort?: "hot" | "new" | "top";
  initialPosts: Post[];
  initialNextCursor: string | null;
  /** The signed-in viewer's votes for `initialPosts`, keyed by post id (ROADMAP.md P0-06). */
  initialVotes?: VoteMap;
  initialViewerId?: string | null;
}

export function TagStream({
  tagName,
  sort = "hot",
  initialPosts,
  initialNextCursor,
  initialVotes,
  initialViewerId = null,
}: TagStreamProps) {
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
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "25");
      params.set("sort", sort);

      const res = await fetch(
        `/api/tags/${encodeURIComponent(tagName)}/posts?${params.toString()}`,
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || "Daha fazla gönderi yüklenemedi.");
        return;
      }

      const newItems: Post[] = data.items || [];
      const newNextCursor: string | null = data.nextCursor ?? null;

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const filteredNew = newItems.filter((p) => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });

      setNextCursor(newNextCursor);
      syncCursorToUrl(newNextCursor, "push");

      // P0-06: fetch the viewer's votes for the newly appended posts.
      if (authStatus === "authenticated" && newItems.length > 0) {
        const newVotes = await fetchVoteMapClient(newItems.map((p) => p.id));
        if (useSessionStore.getState().user?.id === viewerId) {
          setVotes((prev) => ({ ...prev, ...newVotes }));
          setVotesPrincipalId(viewerId);
        }
      }
    } catch {
      toast.error("Bağlantı hatası: Gönderiler yüklenemedi.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Boş durum (Empty State)
  if (posts.length === 0 && !isLoadingMore) {
    return (
      <div className="py-12 px-4 sm:px-6">
        <EmptyState
          icon={MessageSquarePlus}
          title={t("tags.empty_title")}
          description={t("tags.empty_description", { tag: tagName })}
          action={{
            label: t("empty.feed_action"),
            href: "/new",
          }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
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
        label="Daha fazla"
        loadingLabel="Yükleniyor..."
      />
    </div>
  );
}
