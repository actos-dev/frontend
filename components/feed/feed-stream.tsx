"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Post } from "actos";
import { ArrowUp, MessageSquarePlus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/feed/post-card";
import { LoadMore } from "@/components/pagination/load-more";
import { useInfiniteSentinel } from "@/components/pagination/use-infinite-sentinel";
import { Button } from "@/components/ui/button";
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
  density?: "card" | "compact";
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
  density = "card",
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

  const queryOptions = feedQueryOptions(filters, viewer, viewerId);
  const feedIdentity = JSON.stringify(queryOptions.queryKey);
  const feed = useInfiniteQuery({
    ...queryOptions,
    initialData: compatibilityInitialData,
    refetchOnWindowFocus: true,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible" ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
  const [displayedData, setDisplayedData] = useState<typeof feed.data>(feed.data);
  const [pendingNewData, setPendingNewData] = useState<typeof feed.data>();
  const [pendingNewCount, setPendingNewCount] = useState(0);
  const displayedIdentity = useRef(feedIdentity);

  useEffect(() => {
    if (!feed.data || feed.data === displayedData) return;
    if (displayedIdentity.current !== feedIdentity) {
      displayedIdentity.current = feedIdentity;
      setDisplayedData(feed.data);
      setPendingNewData(undefined);
      setPendingNewCount(0);
      return;
    }
    if (!displayedData) {
      setDisplayedData(feed.data);
      return;
    }

    const displayedIds = new Set(
      displayedData.pages.flatMap((page) => page.items.map((post) => post.id)),
    );
    const updatedHead = feed.data.pages[0]?.items ?? [];
    const newPosts = updatedHead.filter((post) => !displayedIds.has(post.id));

    if (newPosts.length > 0 && window.scrollY > 240) {
      setPendingNewData(feed.data);
      setPendingNewCount(newPosts.length);
      return;
    }

    setDisplayedData(feed.data);
    setPendingNewData(undefined);
    setPendingNewCount(0);
  }, [feed.data, displayedData, feedIdentity]);

  const pages = displayedData?.pages ?? feed.data?.pages ?? [];
  const seen = new Set<string>();
  const posts = pages.flatMap((page) =>
    page.items.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    }),
  );
  const votes: VoteMap = Object.assign({}, ...pages.map((page) => page.votes));

  const loadLock = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadLock.current || !feed.hasNextPage || feed.isFetching || pendingNewData) return;

    loadLock.current = true;
    try {
      const result = await feed.fetchNextPage({ cancelRefetch: false });
      if (result.isFetchNextPageError) toast.error("Daha fazla gönderi yüklenemedi.");
    } catch {
      toast.error("Daha fazla gönderi yüklenemedi.");
    } finally {
      loadLock.current = false;
    }
  }, [feed.fetchNextPage, feed.hasNextPage, feed.isFetching, pendingNewData]);

  const sentinelRef = useInfiniteSentinel({
    enabled: Boolean(feed.hasNextPage && !feed.isFetching && !pendingNewData),
    onIntersect: loadMore,
  });

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
      {pendingNewData && (
        <div className="sticky top-14 md:top-0 z-20 flex justify-center px-4 py-2 pointer-events-none">
          <Button
            type="button"
            variant="secondary"
            className="pointer-events-auto rounded-full shadow-md"
            onClick={() => {
              setDisplayedData(pendingNewData);
              setPendingNewData(undefined);
              setPendingNewCount(0);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label={`Yeni gönderileri göster: ${pendingNewCount}`}
          >
            <ArrowUp className="mr-2 h-4 w-4" aria-hidden="true" />
            {pendingNewCount} yeni gönderi
          </Button>
        </div>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          initialUserVote={votes[post.id] ?? 0}
          initialViewerId={viewerId}
          density={density}
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

      {pages.at(-1)?.nextCursor && (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="h-px w-full"
          data-testid="feed-load-sentinel"
        />
      )}
    </div>
  );
}
