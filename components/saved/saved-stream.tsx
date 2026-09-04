"use client";

import type { Post } from "actos";
import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/feed/post-card";
import { LoadMore } from "@/components/pagination/load-more";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonPostCard } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { syncCursorToUrl } from "@/lib/pagination";

export interface SavedStreamProps {
  initialPosts: Post[];
  initialNextCursor: string | null;
}

export function SavedStream({ initialPosts, initialNextCursor }: SavedStreamProps) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setPosts(initialPosts);
    setNextCursor(initialNextCursor);
  }, [initialPosts, initialNextCursor]);

  const handleLoadMore = async (cursor: string) => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await fetch(`/api/saved?cursor=${encodeURIComponent(cursor)}&limit=25`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || "Daha fazla kaydedilen gönderi yüklenemedi.");
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
    } catch {
      toast.error("Bağlantı hatası: Sayfalama gerçekleştirilemedi.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSaveSuccess = (contentId: string, isSaved: boolean) => {
    if (!isSaved) {
      // Remove un-saved item from view
      setPosts((prev) => prev.filter((p) => p.id !== contentId));
    }
  };

  if (posts.length === 0 && !isLoadingMore) {
    return (
      <div className="py-12 px-4 sm:px-6" data-testid="saved-empty-state">
        <EmptyState
          title={t("saved.empty_title") || "Henüz kaydedilmiş bir gönderi yok"}
          description={
            t("saved.empty_description") ||
            "İlginizi çeken gönderileri daha sonra okumak için kaydedebilirsiniz."
          }
          action={{
            label: t("saved.back_to_feed") || "Akışa Dön",
            href: "/",
            icon: Bookmark,
          }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50" data-testid="saved-stream">
      {/* Kaydedilen Gönderiler Listesi */}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} initialSaved={true} onSaveSuccess={handleSaveSuccess} />
      ))}

      {/* Yükleme Sırasında İskelet Kartlar */}
      {isLoadingMore && (
        <div className="divide-y divide-border/50">
          <SkeletonPostCard />
          <SkeletonPostCard />
        </div>
      )}

      {/* Sayfalama: Açık "Daha fazla" Butonu (Plan §4.4 & §Faz 9) */}
      <div className="p-4 sm:p-6 flex justify-center">
        <LoadMore
          nextCursor={nextCursor}
          isLoading={isLoadingMore}
          onLoadMore={handleLoadMore}
          syncUrl={false}
          label="Daha fazla"
          loadingLabel="Yükleniyor..."
          endMessage="Tüm kaydedilenlerin sonuna ulaştınız."
        />
      </div>
    </div>
  );
}
