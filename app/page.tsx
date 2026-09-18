import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Post } from "actos";
import { cookies } from "next/headers";
import { type FeedDensityOption, FeedNav } from "@/components/feed/feed-nav";
import { FeedStream } from "@/components/feed/feed-stream";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient, hasSessionCookie } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { isFeedDensity, parseFeedDensityCookie } from "@/lib/feed-density";
import { isFeedActorType, isFeedSort, isFeedWindow } from "@/lib/feed-params";
import { feedQueryOptions, normalizeFeedFilters } from "@/lib/query/queries";
import { makeServerQueryClient, seedInfinitePage } from "@/lib/query/server";
import type { FeedQueryPage } from "@/lib/query/types";
import { fetchVoteMap, type VoteMap } from "@/lib/votes";

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export default async function HomePage(props: HomePageProps) {
  const rawParams = props.searchParams ? await props.searchParams : {};

  const isFollowing = rawParams.tab === "following";
  const sort = isFollowing ? "new" : isFeedSort(rawParams.sort) ? rawParams.sort : "hot";
  const window = isFeedWindow(rawParams.window) ? rawParams.window : "day";
  const cookieStore = await cookies();
  const densityCookie = cookieStore.get("actos_feed_density")?.value;
  const density: FeedDensityOption = isFeedDensity(rawParams.density)
    ? rawParams.density
    : parseFeedDensityCookie(densityCookie ? `actos_feed_density=${densityCookie}` : undefined);

  const actorTypeRaw = rawParams.actor_type || rawParams.actorType;
  const actorType = isFeedActorType(actorTypeRaw) ? actorTypeRaw : undefined;

  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : undefined;
  const filters = normalizeFeedFilters({
    sort,
    window,
    actorType,
    following: isFollowing,
    initialCursor: cursor,
  });

  // 1. Veri erişimi (RSC, Plan §6.1)
  const client = await getServerClient();
  let viewerId: string | null = null;
  if (await hasSessionCookie()) {
    try {
      viewerId = (await client.auth.whoami())?.actor?.id ?? null;
    } catch {
      viewerId = null;
    }
  }
  const viewer = viewerId ? "authenticated" : "anonymous";

  let posts: Post[] = [];
  let nextCursor: string | null = null;
  let loadError: unknown = null;

  try {
    const feedPage = isFollowing
      ? await client.feed.following({ sort: "new", actorType, cursor, limit: 25 })
      : await client.feed.list({
          sort,
          window: sort === "top" ? window : undefined,
          actorType,
          cursor,
          limit: 25,
        });

    posts = feedPage.items as unknown as Post[];
    nextCursor = feedPage.nextCursor;
  } catch (error) {
    // No fabricated fallback posts (ROADMAP.md P0-02, decision 7): the feed
    // section renders an error state below instead.
    loadError = error;
  }

  // P0-06: the viewer's own votes never live in the (publicly cached)
  // /api/feed response, so fetch them separately, straight through the SDK,
  // and only when a session cookie is actually present.
  let voteMap: VoteMap = {};
  if (posts.length > 0 && viewer === "authenticated") {
    voteMap = await fetchVoteMap(
      client,
      posts.map((p) => p.id),
    );
  }

  const queryClient = makeServerQueryClient();
  if (!loadError) {
    const page: FeedQueryPage = { items: posts, nextCursor, votes: voteMap };
    seedInfinitePage(
      queryClient,
      feedQueryOptions(filters, viewer, viewerId).queryKey,
      page,
      cursor ?? null,
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] divide-y divide-border/60">
      {/* 1. Akış Sekmeleri ve actor_type Filtresi (Plan §4.1, §6.1) */}
      <FeedNav
        currentSort={sort}
        currentWindow={window}
        currentActorType={actorType || ""}
        currentDensity={density}
        currentTab={isFollowing ? "following" : "home"}
      />

      {/* 2. Ana Akış Akışı ve Sayfalama (FeedStream + LoadMore) */}
      {loadError ? (
        <div className="p-6 sm:p-10">
          <ErrorStateRetry {...describeError(loadError)} />
        </div>
      ) : (
        <HydrationBoundary state={dehydrate(queryClient)}>
          <FeedStream
            sort={sort}
            window={window}
            actorType={actorType}
            isFollowing={isFollowing}
            density={density}
            initialCursor={cursor}
            initialViewer={viewer}
            initialViewerId={viewerId}
            emptyTitle="Henüz gönderi yok"
            emptyDescription="İlk gönderiyi sen paylaşarak tartışmayı başlatabilirsin!"
            emptyActionLabel="Yeni Post Oluştur"
            emptyActionHref="/new"
          />
        </HydrationBoundary>
      )}
    </div>
  );
}
