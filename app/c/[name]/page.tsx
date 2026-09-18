import type { Community, Post } from "actos";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityCover } from "@/components/communities/community-cover";
import { CommunityHeader } from "@/components/communities/community-header";
import { CommunityStream } from "@/components/communities/community-stream";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient, hasSessionCookie } from "@/lib/actos";
import { getCommunity, listCommunityPosts } from "@/lib/communities/fetchers";
import { isCommunityCover, isCommunityPostSort } from "@/lib/communities/params";
import { describeError } from "@/lib/errors";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { excerpt } from "@/lib/render/excerpt";
import { getSiteUrl } from "@/lib/seo";
import { fetchVoteMap, type VoteMap } from "@/lib/votes";

interface CommunityPageProps {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ sort?: string; cursor?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  const { name } = await params;
  const communityName = decodeURIComponent(name);
  const siteUrl = getSiteUrl();

  let community: Community | null = null;
  try {
    const client = await getServerClient();
    community = await getCommunity(client, communityName);
  } catch {
    community = null;
  }

  if (!community) {
    return {
      title: `${t("communities.not_found_title")} — Actos`,
      description: t("communities.not_found_description"),
      robots: { index: false, follow: false },
    };
  }

  const description = excerpt(community.description, 160) || t("communities.meta_description");

  return {
    title: `c/${communityName} — Actos`,
    description,
    alternates: { canonical: `${siteUrl}/c/${encodeURIComponent(communityName)}` },
  };
}

/**
 * `/c/[name]`. A private community the viewer cannot see inside renders the
 * cover only; every other viewer gets the header, the Hot/New/Top feed and the
 * community rail. A community that does not exist (or a closed private one)
 * is a 404 from the API and becomes `notFound()` here.
 */
export default async function CommunityPage({ params, searchParams }: CommunityPageProps) {
  if (!FEATURE_COMMUNITIES) notFound();

  const locale = await getServerLocale();
  const { t } = getTranslations(locale);
  const { name } = await params;
  const communityName = decodeURIComponent(name);
  const { sort } = await searchParams;
  const selectedSort = isCommunityPostSort(sort) ? sort : "hot";

  const client = await getServerClient();

  let community: Community | null = null;
  let communityError: unknown = null;
  try {
    community = await getCommunity(client, communityName);
  } catch (error) {
    const { status, code } = describeError(error);
    if (status === 404 || code === "NOT_FOUND") {
      notFound();
    }
    communityError = error;
  }

  if (communityError) {
    return (
      <div className="p-6 sm:p-10">
        <ErrorStateRetry {...describeError(communityError)} />
      </div>
    );
  }

  if (!community) {
    notFound();
  }

  // Cover: private and the viewer is not a member. No feed, no members.
  if (isCommunityCover(community)) {
    return <CommunityCover community={community} t={t} />;
  }

  let posts: Post[] = [];
  let nextCursor: string | null = null;
  let postsError: unknown = null;
  let voteMap: VoteMap = {};
  let viewerId: string | null = null;

  try {
    const page = await listCommunityPosts(client, communityName, {
      sort: selectedSort,
      limit: 25,
    });
    posts = page.items;
    nextCursor = page.nextCursor;

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
        posts.map((post) => post.id),
      );
    }
  } catch (error) {
    // A community that exists but whose posts fail renders its own error
    // state below, never a fabricated feed (ROADMAP.md P0-02).
    postsError = error;
  }

  const sortOptions = [
    ["hot", t("communities.sort_hot")],
    ["new", t("communities.sort_new")],
    ["top", t("communities.sort_top")],
  ] as const;

  return (
    <div>
      <CommunityHeader community={community} locale={locale} t={t} />

      <nav
        className="flex items-center gap-5 border-b border-border px-4 sm:px-6"
        aria-label={t("communities.sort_label")}
      >
        {sortOptions.map(([value, label]) => (
          <Link
            key={value}
            href={
              value === "hot"
                ? `/c/${encodeURIComponent(communityName)}`
                : `/c/${encodeURIComponent(communityName)}?sort=${value}`
            }
            aria-current={selectedSort === value ? "page" : undefined}
            className={
              selectedSort === value
                ? "border-b-2 border-accent py-2 text-sm font-semibold text-fg"
                : "py-2 text-sm text-fg-muted hover:text-fg"
            }
          >
            {label}
          </Link>
        ))}
      </nav>

      {postsError ? (
        <div className="p-6 sm:p-10">
          <ErrorStateRetry {...describeError(postsError)} />
        </div>
      ) : (
        <CommunityStream
          communityName={communityName}
          sort={selectedSort}
          initialPosts={posts}
          initialNextCursor={nextCursor}
          initialVotes={voteMap}
          initialViewerId={viewerId}
        />
      )}
    </div>
  );
}
