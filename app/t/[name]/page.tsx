import type { Post } from "actos";
import type { Metadata } from "next";
import Link from "next/link";
import { TagStream } from "@/components/tags/tag-stream";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient, hasSessionCookie } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";
import { fetchVoteMap, type VoteMap } from "@/lib/votes";

interface TagPageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ cursor?: string; sort?: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  const { name } = await params;
  const decodedName = decodeURIComponent(name).toLowerCase();
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/t/${encodeURIComponent(decodedName)}`;
  const title = `${t("tags.detail_title", { tag: decodedName })} — Actos`;
  const description = t("tags.detail_description", { tag: decodedName });
  const ogImageUrl = `${siteUrl}/t/${encodeURIComponent(decodedName)}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${t("tags.detail_title", { tag: decodedName })} — Actos`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function TagDetailPage({ params, searchParams }: TagPageProps) {
  const { t } = getTranslations(await getServerLocale());
  const { name } = await params;
  const { cursor, sort } = await searchParams;
  const decodedName = decodeURIComponent(name).toLowerCase();
  const selectedSort = sort === "new" || sort === "top" ? sort : "hot";

  let posts: Post[] = [];
  let nextCursor: string | null = null;
  let totalCount: number | null = null;
  let loadError: unknown = null;
  let voteMap: VoteMap = {};
  let viewerId: string | null = null;

  try {
    const client = await getServerClient();
    const page = await client.tags.posts(decodedName, {
      limit: 25,
      cursor,
      sort: selectedSort,
    });

    posts = page.items;
    nextCursor = page.nextCursor ?? null;

    // Also attempt to get tag summary for total post count if available
    try {
      const tagList = await client.tags.popular({ limit: 100 });
      const currentTag = tagList.items.find((t) => t.name.toLowerCase() === decodedName);
      if (currentTag && currentTag.postCount !== undefined) {
        totalCount = currentTag.postCount;
      }
    } catch {
      // Ignore count fetch error
    }

    // P0-06: the viewer's own votes never live in a cached, shared list
    // response, so fetch them separately and only when signed in.
    if (await hasSessionCookie()) {
      try {
        viewerId = (await client.auth.whoami())?.actor?.id ?? null;
      } catch {
        viewerId = null;
      }
    }
    if (posts.length > 0 && viewerId) {
      voteMap = await fetchVoteMap(
        client,
        posts.map((p) => p.id),
      );
    }
  } catch (error) {
    // No fabricated posts (ROADMAP.md P0-02, decision 7): render an error
    // state with retry instead.
    loadError = error;
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div className="border-b border-border pb-5">
          <h1 className="font-serif text-3xl font-semibold text-foreground">#{decodedName}</h1>
        </div>
        <ErrorStateRetry {...describeError(loadError)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Etiket Başlığı */}
      <div className="border-b border-border pb-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">#{decodedName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalCount === null
                ? t("tags.at_least_post_count", { count: posts.length })
                : t("tags.post_count", { count: totalCount })}
            </p>
          </div>

          <Link
            href="/tags"
            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            <span>← {t("tags.back_to_all")}</span>
          </Link>
        </div>
      </div>

      <nav
        className="flex items-center gap-5 border-b border-border"
        aria-label={t("tags.detail_sort_label")}
      >
        {(
          [
            ["hot", t("tags.sort_hot")],
            ["new", t("tags.sort_new")],
            ["top", t("tags.sort_top")],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={
              value === "hot"
                ? `/t/${encodeURIComponent(decodedName)}`
                : `/t/${encodeURIComponent(decodedName)}?sort=${value}`
            }
            aria-current={selectedSort === value ? "page" : undefined}
            className={
              selectedSort === value
                ? "border-b-2 border-accent py-2 text-sm font-semibold text-foreground"
                : "py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Gönderi Akışı */}
      <TagStream
        tagName={decodedName}
        sort={selectedSort}
        initialPosts={posts}
        initialNextCursor={nextCursor}
        initialVotes={voteMap}
        initialViewerId={viewerId}
      />
    </div>
  );
}
