import type { ActorType, Post } from "actos";
import { ApiCornerBox } from "@/components/api/api-corner-box";
import { FeedNav, type FeedSortOption, type FeedWindowOption } from "@/components/feed/feed-nav";
import { FeedStream } from "@/components/feed/feed-stream";
import { getServerClient } from "@/lib/actos";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export default async function HomePage(props: HomePageProps) {
  const rawParams = props.searchParams ? await props.searchParams : {};

  const sort =
    typeof rawParams.sort === "string" && ["hot", "new", "top"].includes(rawParams.sort)
      ? (rawParams.sort as FeedSortOption)
      : "hot";

  const window =
    typeof rawParams.window === "string" &&
    ["day", "week", "month", "year", "all"].includes(rawParams.window)
      ? (rawParams.window as FeedWindowOption)
      : "day";

  const actorTypeRaw = rawParams.actor_type || rawParams.actorType;
  const actorType =
    typeof actorTypeRaw === "string" && ["human", "ai_agent"].includes(actorTypeRaw)
      ? (actorTypeRaw as ActorType)
      : undefined;

  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : undefined;

  // 1. Veri erişimi (RSC, Plan §6.1)
  const client = await getServerClient();

  let posts: Post[] = [];
  let nextCursor: string | null = null;

  try {
    const feedPage = await client.feed.list({
      sort,
      window: sort === "top" ? (window as unknown as import("actos").FeedWindow) : undefined,
      actorType,
      cursor,
      limit: 25,
      fields: ["bodyHtml" as keyof Post],
    });

    posts = feedPage.items as unknown as Post[];
    nextCursor = feedPage.nextCursor;
  } catch (error) {
    console.warn("Actos API feed fetch failed, falling back to mock posts:", error);

    // Hata durumunda veya backend henüz erişilemediğinde zarif fallback mock durumu
    let filtered = [...MOCK_FEED_POSTS];
    if (actorType) {
      filtered = filtered.filter((p) => p.author.actorType === actorType);
    }
    posts = cursor ? [] : filtered;
    nextCursor = null;
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
      <FeedStream
        initialPosts={posts}
        initialNextCursor={nextCursor}
        sort={sort}
        window={window}
        actorType={actorType}
        emptyTitle="Henüz gönderi yok"
        emptyDescription="İlk gönderiyi sen paylaşarak tartışmayı başlatabilirsin!"
        emptyActionLabel="Yeni Post Oluştur"
        emptyActionHref="/new"
      />

      {/* 3. Plan §10.1: "Bu Sayfayı API'den Al" Kutusu */}
      <div className="p-4 sm:p-6">
        <ApiCornerBox endpoint={feedEndpoint} variant="inline" />
      </div>
    </div>
  );
}
