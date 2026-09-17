"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Post } from "actos";
import { Bookmark } from "lucide-react";
import { PostCard } from "@/components/feed/post-card";
import { LoadMore } from "@/components/pagination/load-more";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonPostCard } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { savedQueryOptions } from "@/lib/query/queries";
import type { SavedQueryPage } from "@/lib/query/types";
import { useSessionStore } from "@/lib/stores/session-store";
import type { VoteMap } from "@/lib/votes";

export interface SavedStreamProps {
  initialPosts?: Post[];
  initialNextCursor?: string | null;
  initialVotes?: VoteMap;
  initialCursor?: string;
  initialViewerId?: string | null;
}

export function SavedStream({
  initialPosts,
  initialNextCursor = null,
  initialVotes,
  initialCursor,
  initialViewerId,
}: SavedStreamProps) {
  const { t } = useTranslation();
  const authStatus = useSessionStore((state) => state.status);
  const sessionUserId = useSessionStore((state) => state.user?.id ?? null);
  const viewerId =
    authStatus === "authenticated"
      ? (sessionUserId ?? initialViewerId ?? null)
      : authStatus === "unauthenticated"
        ? null
        : (initialViewerId ?? null);
  const initialStateMatchesViewer = initialViewerId === undefined || initialViewerId === viewerId;
  const compatibilityInitialData =
    initialPosts === undefined
      ? undefined
      : {
          pages: [
            {
              items: initialPosts,
              nextCursor: initialNextCursor,
              votes: initialVotes ?? {},
            } satisfies SavedQueryPage,
          ],
          pageParams: [initialCursor ?? null],
        };
  const saved = useInfiniteQuery({
    ...savedQueryOptions(initialCursor, viewerId),
    initialData: initialStateMatchesViewer ? compatibilityInitialData : undefined,
  });
  const pages = saved.data?.pages ?? [];
  const seen = new Set<string>();
  const posts = pages.flatMap((page) =>
    page.items.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    }),
  );
  const votes = Object.assign({}, ...pages.map((page) => page.votes)) as VoteMap;

  if (saved.isPending && posts.length === 0) {
    return (
      <div className="divide-y divide-border/50" aria-busy="true">
        <SkeletonPostCard />
        <SkeletonPostCard />
      </div>
    );
  }

  if (saved.isError && posts.length === 0) {
    return (
      <div role="alert" className="p-6 text-center text-sm text-muted-foreground">
        {t("states.savedLoadFailed") || "Kaydedilenler yüklenemedi. Yeniden deneyin."}
      </div>
    );
  }

  if (posts.length === 0) {
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
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          initialSaved={true}
          initialUserVote={votes[post.id] ?? 0}
          initialViewerId={viewerId}
        />
      ))}
      {saved.isFetchingNextPage && (
        <div className="divide-y divide-border/50">
          <SkeletonPostCard />
          <SkeletonPostCard />
        </div>
      )}
      {saved.isFetchNextPageError && (
        <p role="alert" className="p-4 text-center text-sm text-destructive">
          Kaydedilenler yüklenemedi.
        </p>
      )}
      <div className="p-4 sm:p-6 flex justify-center">
        <LoadMore
          nextCursor={pages.at(-1)?.nextCursor ?? null}
          isLoading={saved.isFetchingNextPage}
          onLoadMore={async () => {
            const result = await saved.fetchNextPage();
            if (result.isFetchNextPageError)
              toast.error("Daha fazla kaydedilen gönderi yüklenemedi.");
          }}
          syncUrl={false}
          label="Daha fazla"
          loadingLabel="Yükleniyor..."
          endMessage="Tüm kaydedilenlerin sonuna ulaştınız."
        />
      </div>
    </div>
  );
}
