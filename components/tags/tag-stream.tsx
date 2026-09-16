"use client";

import type { Post } from "actos";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/feed/post-card";
import { LoadMore } from "@/components/pagination/load-more";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { syncCursorToUrl } from "@/lib/pagination";
import { useSessionStore } from "@/lib/stores/session-store";
import { fetchVoteMapClient, type VoteMap } from "@/lib/votes";

export interface TagStreamProps {
  tagName: string;
  initialPosts: Post[];
  initialNextCursor: string | null;
  /** The signed-in viewer's votes for `initialPosts`, keyed by post id (ROADMAP.md P0-06). */
  initialVotes?: VoteMap;
}

export function TagStream({
  tagName,
  initialPosts,
  initialNextCursor,
  initialVotes,
}: TagStreamProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [votes, setVotes] = useState<VoteMap>(initialVotes ?? {});
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const authStatus = useSessionStore((state) => state.status);

  useEffect(() => {
    setPosts(initialPosts);
    setNextCursor(initialNextCursor);
    setVotes(initialVotes ?? {});
  }, [initialPosts, initialNextCursor, initialVotes]);

  const handleLoadMore = async (cursor: string) => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "25");

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
        setVotes((prev) => ({ ...prev, ...newVotes }));
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
          title="Bu etikete ait henüz bir gönderi bulunamadı. İlk gönderiyi sen paylaş!"
          description={`#${tagName} etiketi altında henüz bir tartışma başlatılmamış.`}
          action={{
            label: "Yeni Post Paylaş",
            href: "/new",
          }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} initialUserVote={votes[post.id] ?? 0} />
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
