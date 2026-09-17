"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Post } from "actos";
import { MessageSquarePlus } from "lucide-react";
import { PostCard } from "@/components/feed/post-card";
import { LoadMore } from "@/components/pagination/load-more";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonPostCard } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { feedQueryOptions, normalizeFeedFilters } from "@/lib/query/queries";
import type { FeedQueryPage } from "@/lib/query/types";
import { useSessionStore } from "@/lib/stores/session-store";
import type { VoteMap } from "@/lib/votes";

export interface FeedStreamProps {
  /** Compatibility inputs are useful for isolated embeds and component tests. */
  initialPosts?: Post[];
  initialNextCursor?: string | null;
  initialVotes?: VoteMap;
  initialCursor?: string;
  initialViewer?: "anonymous" | "authenticated";
  initialViewerId?: string | null;
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
  initialNextCursor = null,
  initialVotes,
  initialCursor,
  initialViewer = "anonymous",
  initialViewerId = null,
  sort,
  window: timeWindow,
  actorType,
  isFollowing = false,
  emptyTitle = "Henüz gönderi yok",
  emptyDescription = "İlk gönderiyi sen paylaşarak tartışmayı başlatabilirsin!",
  emptyActionLabel = "Yeni Post Oluştur",
  emptyActionHref = "/new",
}: FeedStreamProps) {
  const authStatus = useSessionStore((state) => state.status);
  const sessionUserId = useSessionStore((state) => state.user?.id ?? null);
  const viewerId =
    authStatus === "authenticated"
      ? (sessionUserId ?? initialViewerId)
      : authStatus === "unauthenticated"
        ? null
        : initialViewerId;
  const viewer = viewerId
    ? "authenticated"
    : initialViewer === "authenticated" && authStatus !== "unauthenticated"
      ? "authenticated"
      : "anonymous";
  const filters = normalizeFeedFilters({
    sort,
    window: timeWindow,
    actorType,
    following: isFollowing,
    initialCursor,
  });
  const compatibilityInitialData =
    initialPosts === undefined
      ? undefined
      : {
          pages: [
            {
              items: initialPosts,
              nextCursor: initialNextCursor,
              votes: initialVotes ?? {},
            } satisfies FeedQueryPage,
          ],
          pageParams: [initialCursor ?? null],
        };

  const feed = useInfiniteQuery({
    ...feedQueryOptions(filters, viewer, viewerId),
    initialData: compatibilityInitialData,
  });
  const pages = feed.data?.pages ?? [];
  const seen = new Set<string>();
  const posts = pages.flatMap((page) =>
    page.items.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    }),
  );
  const votes: VoteMap = Object.assign({}, ...pages.map((page) => page.votes));

  const loadMore = async () => {
    try {
      await feed.fetchNextPage();
    } catch {
      toast.error("Daha fazla gönderi yüklenemedi.");
    }
  };

  if (feed.isPending && posts.length === 0) {
    return (
      <div className="divide-y divide-border/50" aria-busy="true">
        <SkeletonPostCard />
        <SkeletonPostCard />
      </div>
    );
  }

  if (feed.isError && posts.length === 0) {
    return (
      <div role="alert" className="p-6 text-center text-sm text-muted-foreground">
        Akış yüklenemedi. Sayfayı yenileyip tekrar deneyin.
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-12 px-4 sm:px-6">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={{ label: emptyActionLabel, href: emptyActionHref, icon: MessageSquarePlus }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          initialUserVote={votes[post.id] ?? 0}
          initialViewerId={viewerId}
        />
      ))}

      {feed.isFetchingNextPage && (
        <div className="divide-y divide-border/50">
          <SkeletonPostCard />
          <SkeletonPostCard />
        </div>
      )}

      <div className="p-4 sm:p-6 flex justify-center">
        <LoadMore
          nextCursor={pages.at(-1)?.nextCursor ?? null}
          isLoading={feed.isFetchingNextPage}
          onLoadMore={loadMore}
          syncUrl={false}
          label="Daha fazla"
          loadingLabel="Yükleniyor..."
          endMessage="Tüm akışın sonuna ulaştınız."
        />
      </div>
    </div>
  );
}
