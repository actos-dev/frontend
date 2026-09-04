"use client";

import type { Post } from "actos";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/feed/post-card";
import { LoadMore } from "@/components/pagination/load-more";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonPostCard } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { syncCursorToUrl } from "@/lib/pagination";

export interface FeedStreamProps {
  initialPosts: Post[];
  initialNextCursor: string | null;
  sort?: string;
  window?: string;
  actorType?: string;
  isFollowing?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
}

export function FeedStream({
  initialPosts,
  initialNextCursor,
  sort = "hot",
  window: timeWindow,
  actorType,
  isFollowing = false,
  emptyTitle = "Henüz gönderi yok",
  emptyDescription = "İlk gönderiyi sen paylaşarak tartışmayı başlatabilirsin!",
  emptyActionLabel = "Yeni Post Oluştur",
  emptyActionHref = "/new",
}: FeedStreamProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Sync state when initial props change (e.g. tab / filter changed via RSC navigation)
  useEffect(() => {
    setPosts(initialPosts);
    setNextCursor(initialNextCursor);
  }, [initialPosts, initialNextCursor]);

  const handleLoadMore = async (cursor: string) => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams();
      if (sort) params.set("sort", sort);
      if (timeWindow) params.set("window", timeWindow);
      if (actorType) params.set("actor_type", actorType);
      if (cursor) params.set("cursor", cursor);
      if (isFollowing) params.set("following", "true");
      params.set("limit", "25");

      const endpoint = isFollowing ? "/api/feed/following" : "/api/feed";
      const res = await fetch(`${endpoint}?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || "Daha fazla gönderi yüklenemedi.");
        return;
      }

      const newItems: Post[] = data.items || [];
      const newNextCursor: string | null = data.nextCursor ?? null;

      setPosts((prev) => {
        // Deduplicate items by ID
        const existingIds = new Set(prev.map((p) => p.id));
        const filteredNew = newItems.filter((p) => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });

      setNextCursor(newNextCursor);

      // Keyset cursor URL query param'ı ile senkronize kalır (Plan §4.4)
      syncCursorToUrl(newNextCursor, "push");
    } catch {
      toast.error("Bağlantı hatası: Sayfalama gerçekleştirilemedi.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Boş durum (Empty State)
  if (posts.length === 0 && !isLoadingMore) {
    return (
      <div className="py-12 px-4 sm:px-6">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={{
            label: emptyActionLabel,
            href: emptyActionHref,
            icon: MessageSquarePlus,
          }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {/* Gönderi Listesi */}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Yükleme Sırasında İskelet Kartlar */}
      {isLoadingMore && (
        <div className="divide-y divide-border/50">
          <SkeletonPostCard />
          <SkeletonPostCard />
        </div>
      )}

      {/* Sayfalama: Açık "Daha fazla" Butonu (Plan §4.4) */}
      <div className="p-4 sm:p-6 flex justify-center">
        <LoadMore
          nextCursor={nextCursor}
          isLoading={isLoadingMore}
          onLoadMore={handleLoadMore}
          syncUrl={false} // Handled inside handleLoadMore with push state
          label="Daha fazla"
          loadingLabel="Yükleniyor..."
          endMessage="Tüm akışın sonuna ulaştınız."
        />
      </div>
    </div>
  );
}
