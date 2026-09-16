import type { Post } from "actos";
import { ApiCornerBox } from "@/components/api/api-corner-box";
import { FeedNav } from "@/components/feed/feed-nav";
import { FeedStream } from "@/components/feed/feed-stream";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient, hasSessionCookie } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { isFeedActorType, isFeedSort, isFeedWindow } from "@/lib/feed-params";
import { fetchVoteMap, type VoteMap } from "@/lib/votes";

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export default async function HomePage(props: HomePageProps) {
  const rawParams = props.searchParams ? await props.searchParams : {};

  const sort = isFeedSort(rawParams.sort) ? rawParams.sort : "hot";
  const window = isFeedWindow(rawParams.window) ? rawParams.window : "day";

  const actorTypeRaw = rawParams.actor_type || rawParams.actorType;
  const actorType = isFeedActorType(actorTypeRaw) ? actorTypeRaw : undefined;

  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : undefined;

  // 1. Veri erişimi (RSC, Plan §6.1)
  const client = await getServerClient();

  let posts: Post[] = [];
  let nextCursor: string | null = null;
  let loadError: unknown = null;

  try {
    const feedPage = await client.feed.list({
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
  if (posts.length > 0 && (await hasSessionCookie())) {
    voteMap = await fetchVoteMap(
      client,
      posts.map((p) => p.id),
    );
  }

  let feedEndpoint = `/feed?sort=${sort}&limit=25`;
  if (sort === "top" && window) {
    feedEndpoint += `&window=${window}`;
  }
  if (actorType) {
    feedEndpoint += `&actor_type=${actorType}`;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] divide-y divide-border/60">
      {/* 1. Akış Sekmeleri ve actor_type Filtresi (Plan §4.1, §6.1) */}
      <FeedNav currentSort={sort} currentWindow={window} currentActorType={actorType || ""} />

      {/* 2. Ana Akış Akışı ve Sayfalama (FeedStream + LoadMore) */}
      {loadError ? (
        <div className="p-6 sm:p-10">
          <ErrorStateRetry {...describeError(loadError)} />
        </div>
      ) : (
        <FeedStream
          initialPosts={posts}
          initialNextCursor={nextCursor}
          initialVotes={voteMap}
          sort={sort}
          window={window}
          actorType={actorType}
          emptyTitle="Henüz gönderi yok"
          emptyDescription="İlk gönderiyi sen paylaşarak tartışmayı başlatabilirsin!"
          emptyActionLabel="Yeni Post Oluştur"
          emptyActionHref="/new"
        />
      )}

      {/* 3. Plan §10.1: "Bu Sayfayı API'den Al" Kutusu */}
      <div className="p-4 sm:p-6">
        <ApiCornerBox endpoint={feedEndpoint} variant="inline" />
      </div>
    </div>
  );
}
