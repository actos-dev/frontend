import type { ActorProfile, Comment, Page, Post } from "actos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/feed/post-card";
import { ProfileActorList } from "@/components/profile/profile-actor-list";
import { ProfileCommentCard } from "@/components/profile/profile-comment-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { type ProfileTab, ProfileTabs } from "@/components/profile/profile-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { Gone } from "@/components/ui/gone";
import { getServerClient, hasSessionCookie } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/seo";
import { fetchVoteMap, type VoteMap } from "@/lib/votes";

export const dynamic = "force-dynamic";

export interface ProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

/**
 * SEO and Social Media Previews for Actor Profile (Plan §Faz 16).
 */
export async function generateMetadata(props: ProfilePageProps): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  const { username: rawUsername } = await props.params;
  const username = decodeURIComponent(rawUsername);
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/u/${encodeURIComponent(username)}`;

  let profile: ActorProfile | null = null;
  let isGone = false;

  try {
    const client = await getServerClient();
    profile = await client.actors.get(username);
  } catch (err: unknown) {
    const { status, code } = describeError(err);
    if (status === 410 || code === "GONE") {
      isGone = true;
    }
    // Any other failure (404, or a real backend error) leaves `profile`
    // null; the fallbacks below already degrade to the bare username
    // instead of fabricating a profile (ROADMAP.md P0-02, decision 7).
  }

  if (isGone) {
    return {
      title: `@${username} (${t("profile.account_deleted")}) — Actos`,
      description: t("profile.account_deleted_desc"),
      robots: { index: false, follow: false },
    };
  }

  const displayName = profile?.actor?.displayName || profile?.actor?.username || username;
  const bio = profile?.actor?.bio || t("profile.metadata_description", { username });
  const ogImageUrl = `${siteUrl}/u/${encodeURIComponent(username)}/opengraph-image`;
  const previewImage = ogImageUrl;
  const title = `${displayName} (@${username}) — Actos`;

  return {
    title,
    description: bio,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: bio,
      url: canonicalUrl,
      type: "profile",
      username: username,
      images: [
        {
          url: previewImage,
          width: 1200,
          height: 630,
          alt: `${displayName} (@${username})`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: bio,
      images: [previewImage],
    },
  };
}

/**
 * Public actor profile page (Server Component) (Plan §Faz 11).
 *
 * Requirements:
 * - Fetches profile via client.actors.get(username).
 * - Displays header with large avatar, username, glyph+label flair, bio, neutral trust level, account age, stats.
 * - Tabs for posts, comments, followers, following.
 * - FollowButton for visitors, "Profili Düzenle" for profile owner.
 */
export default async function ProfilePage(props: ProfilePageProps) {
  const { t } = getTranslations(await getServerLocale());
  const { username: rawUsername } = await props.params;
  const username = decodeURIComponent(rawUsername);
  const { tab: rawTab } = await props.searchParams;

  const activeTab: ProfileTab =
    rawTab === "comments" || rawTab === "followers" || rawTab === "following" ? rawTab : "posts";

  const client = await getServerClient();
  let viewerId: string | null = null;
  if (await hasSessionCookie()) {
    try {
      viewerId = (await client.auth.whoami())?.actor?.id ?? null;
    } catch {
      viewerId = null;
    }
  }

  let profile: ActorProfile | null = null;
  let profileError: unknown = null;

  try {
    profile = await client.actors.get(username);
  } catch (err: unknown) {
    const { status, code } = describeError(err);
    if (status === 404 || code === "NOT_FOUND") {
      notFound();
    }
    if (status === 410 || code === "GONE") {
      return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <Gone
            title={t("profile.account_deleted")}
            message={t("profile.account_deleted_desc")}
            author={{ username, displayName: username }}
          />
        </div>
      );
    }

    // A real backend failure (500, 429, timeout, connection): render an
    // error state, never a fabricated demo profile or a masked 404
    // (ROADMAP.md P0-02, decision 7).
    profileError = err;
  }

  if (profileError || !profile) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <ErrorStateRetry {...describeError(profileError)} />
      </div>
    );
  }

  // Fetch followers and following samples for accurate header stats & tab data
  const [followersRes, followingRes] = await Promise.all([
    client.actors.followers(username, { limit: 50 }).catch(() => ({ items: [], nextCursor: null })),
    client.actors.following(username, { limit: 50 }).catch(() => ({ items: [], nextCursor: null })),
  ]);

  // Tab-specific data loading
  let postsPage: Page<Post> = { items: [], nextCursor: null };
  let postsError: unknown = null;
  let commentsPage: Page<Comment> = { items: [], nextCursor: null };
  let voteMap: VoteMap = {};

  if (activeTab === "posts") {
    try {
      postsPage = await client.actors.posts(username, { limit: 20 });
    } catch (err) {
      // No fabricated posts: the posts tab renders its own error state below
      // instead (ROADMAP.md P0-02, decision 7).
      postsError = err;
    }

    // P0-06: the viewer's own votes never live in a shared, cached list
    // response, so fetch them separately and only when signed in.
    if (postsPage.items.length > 0 && viewerId) {
      voteMap = await fetchVoteMap(
        client,
        postsPage.items.map((p) => p.id),
      );
    }
  } else if (activeTab === "comments") {
    commentsPage = await client.actors
      .comments(username, { limit: 20 })
      .catch(() => ({ items: [], nextCursor: null }));
  }

  // P0-10: ActorStats has no follower/following counts yet. Until the
  // backend exposes totals, show the exact count only when the page we
  // fetched is the whole list (no next cursor); otherwise "50+", never an
  // invented total.
  const followerCount: number | string = followersRes.nextCursor
    ? "50+"
    : followersRes.items.length;
  const followingCount: number | string = followingRes.nextCursor
    ? "50+"
    : followingRes.items.length;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* 1. Profil Başlık Bölümü */}
      <ProfileHeader
        actor={profile.actor}
        stats={profile.stats}
        followerCount={followerCount}
        followingCount={followingCount}
        initialViewerId={viewerId}
      />

      {/* 2. Sekmeler (Tabs) */}
      <ProfileTabs
        username={username}
        activeTab={activeTab}
        postCount={profile.stats.postCount}
        commentCount={profile.stats.commentCount}
        followerCount={followerCount}
        followingCount={followingCount}
      />

      {/* 3. Sekme İçeriği */}
      <main className="pt-2">
        {activeTab === "posts" && (
          <section aria-label={t("profile.posts_section_label")}>
            {postsError ? (
              <ErrorStateRetry
                {...describeError(postsError)}
                className="py-12 border border-dashed border-border rounded-2xl bg-card/40"
              />
            ) : postsPage.items.length === 0 ? (
              <EmptyState
                title={t("profile.empty_posts")}
                description={t("profile.empty_posts_desc")}
                className="py-12 border border-dashed border-border rounded-2xl bg-card/40"
              />
            ) : (
              <div className="space-y-4" data-testid="profile-posts-list">
                {postsPage.items.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    initialUserVote={voteMap[post.id] ?? 0}
                    initialViewerId={viewerId}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "comments" && (
          <section aria-label={t("profile.comments_section_label")}>
            {commentsPage.items.length === 0 ? (
              <EmptyState
                title={t("profile.empty_comments")}
                description={t("profile.empty_comments_desc")}
                className="py-12 border border-dashed border-border rounded-2xl bg-card/40"
              />
            ) : (
              <div className="space-y-3" data-testid="profile-comments-list">
                {commentsPage.items.map((comment) => (
                  <ProfileCommentCard key={comment.id} comment={comment} username={username} />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "followers" && (
          <section aria-label={t("profile.followers_section_label")}>
            {followersRes.items.length === 0 ? (
              <EmptyState
                title={t("profile.empty_followers")}
                description={t("profile.empty_followers_desc")}
                className="py-12 border border-dashed border-border rounded-2xl bg-card/40"
              />
            ) : (
              <ProfileActorList
                username={username}
                relation="followers"
                initialActors={followersRes.items}
                initialNextCursor={followersRes.nextCursor}
              />
            )}
          </section>
        )}

        {activeTab === "following" && (
          <section aria-label={t("profile.following_section_label")}>
            {followingRes.items.length === 0 ? (
              <EmptyState
                title={t("profile.empty_following")}
                description={t("profile.empty_following_desc")}
                className="py-12 border border-dashed border-border rounded-2xl bg-card/40"
              />
            ) : (
              <ProfileActorList
                username={username}
                relation="following"
                initialActors={followingRes.items}
                initialNextCursor={followingRes.nextCursor}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
