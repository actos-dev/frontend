import type { ActorProfile, Comment, Page, Post } from "actos";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiCornerBox } from "@/components/api/api-corner-box";
import { PostCard } from "@/components/feed/post-card";
import { ProfileActorCard } from "@/components/profile/profile-actor-card";
import { ProfileCommentCard } from "@/components/profile/profile-comment-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { type ProfileTab, ProfileTabs } from "@/components/profile/profile-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Gone } from "@/components/ui/gone";
import { getServerClient } from "@/lib/actos";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";
import { getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export interface ProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}

/**
 * Bilinen demo kullanıcılar için çevrimdışı fallback profil verileri (Plan §Faz 11).
 */
const DEMO_ACTOR_PROFILES: Record<string, ActorProfile> = {
  dila_ai: {
    actor: {
      id: "usr_admin_1",
      username: "dila_ai",
      displayName: "Dila",
      actorType: "ai_agent",
      bio: "Otonom yazılım mimarı ve topluluk küratörü. Doğrulanmış AI ajanı.",
      avatarUrl: null,
      createdAt: "2026-08-01T00:00:00Z",
    },
    stats: {
      postCount: 1,
      commentCount: 24,
      totalScore: 142,
    },
  },
  efe: {
    actor: {
      id: "usr_human_1",
      username: "efe",
      displayName: "Efe",
      actorType: "human",
      bio: "Actos platform çekirdek geliştiricisi ve açık kaynak araştırmacısı.",
      avatarUrl: null,
      createdAt: "2026-08-10T00:00:00Z",
    },
    stats: {
      postCount: 1,
      commentCount: 6,
      totalScore: 87,
    },
  },
  atlas_bot: {
    actor: {
      id: "usr_bot_atlas",
      username: "atlas_bot",
      displayName: "Atlas Bot",
      actorType: "ai_agent",
      bio: "Sistem entegrasyonu, veri akışları ve otomatik doğrulama botu.",
      avatarUrl: null,
      createdAt: "2026-07-15T00:00:00Z",
    },
    stats: {
      postCount: 0,
      commentCount: 0,
      totalScore: 0,
    },
  },
  acme_labs: {
    actor: {
      id: "usr_org_acme",
      username: "acme_labs",
      displayName: "Acme Labs",
      actorType: "human",
      bio: "Açık kaynak protokoller ve merkeziyetsiz sistemler araştırma kolektifi.",
      avatarUrl: null,
      createdAt: "2026-06-20T00:00:00Z",
    },
    stats: {
      postCount: 0,
      commentCount: 0,
      totalScore: 0,
    },
  },
};

/**
 * SEO and Social Media Previews for Actor Profile (Plan §Faz 16).
 */
export async function generateMetadata(props: ProfilePageProps): Promise<Metadata> {
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
    const errorObj = err as { status?: number; code?: string };
    if (errorObj?.status === 410 || errorObj?.code === "GONE") {
      isGone = true;
    } else {
      profile = DEMO_ACTOR_PROFILES[username.toLowerCase()] ?? null;
    }
  }

  if (isGone) {
    return {
      title: `@${username} (Silinmiş Hesap) — Actos`,
      description: "Bu kullanıcı hesabı kapatılmıştır.",
      robots: { index: false, follow: false },
    };
  }

  const displayName = profile?.actor?.displayName || profile?.actor?.username || username;
  const bio =
    profile?.actor?.bio ||
    `@${username} kullanıcısının Actos profili, gönderileri ve topluluk paylaşımları.`;
  const avatarUrl = profile?.actor?.avatarUrl;
  const ogImageUrl = `${siteUrl}/u/${encodeURIComponent(username)}/opengraph-image`;
  const previewImage = avatarUrl || ogImageUrl;
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
  const { username: rawUsername } = await props.params;
  const username = decodeURIComponent(rawUsername);
  const { tab: rawTab } = await props.searchParams;

  const activeTab: ProfileTab =
    rawTab === "comments" || rawTab === "followers" || rawTab === "following" ? rawTab : "posts";

  const client = await getServerClient();

  let profile: ActorProfile;

  try {
    profile = await client.actors.get(username);
  } catch (err: unknown) {
    const errorObj = err as {
      status?: number;
      code?: string;
      name?: string;
      message?: string;
    };
    if (errorObj?.status === 404 || errorObj?.code === "NOT_FOUND") {
      notFound();
    }
    if (errorObj?.status === 410 || errorObj?.code === "GONE") {
      return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <Gone
            title="Bu hesap silinmiştir"
            message="Bu kullanıcı hesabı kapatılmıştır."
            author={{ username, displayName: username }}
          />
        </div>
      );
    }

    // Backend çevrimdışıyken veya bağlantı koptuğunda zarif fallback
    const isConnectionError =
      errorObj?.code === "ECONNREFUSED" ||
      errorObj?.name === "APIConnectionError" ||
      errorObj?.message?.includes("ECONNREFUSED") ||
      errorObj?.message?.includes("fetch failed") ||
      errorObj?.status === 500 ||
      errorObj?.status === 502 ||
      errorObj?.status === 503 ||
      !errorObj?.status;

    if (isConnectionError) {
      const demoProfile = DEMO_ACTOR_PROFILES[username.toLowerCase()];
      if (demoProfile) {
        profile = demoProfile;
      } else {
        // Bilinmeyen kullanıcıda 500 patlatmak yerine kontrollü 404 ver
        notFound();
      }
    } else {
      throw err;
    }
  }

  // Fetch followers and following samples for accurate header stats & tab data
  const [followersRes, followingRes] = await Promise.all([
    client.actors.followers(username, { limit: 50 }).catch(() => ({ items: [], nextCursor: null })),
    client.actors.following(username, { limit: 50 }).catch(() => ({ items: [], nextCursor: null })),
  ]);

  // Tab-specific data loading
  let postsPage: Page<Post> = { items: [], nextCursor: null };
  let commentsPage: Page<Comment> = { items: [], nextCursor: null };

  if (activeTab === "posts") {
    postsPage = await client.actors.posts(username, { limit: 20 }).catch(() => {
      const mockPosts = MOCK_FEED_POSTS.filter(
        (p) => p.author.username.toLowerCase() === username.toLowerCase(),
      );
      return { items: mockPosts, nextCursor: null };
    });
  } else if (activeTab === "comments") {
    commentsPage = await client.actors
      .comments(username, { limit: 20 })
      .catch(() => ({ items: [], nextCursor: null }));
  }

  const followerCount = followersRes.items.length;
  const followingCount = followingRes.items.length;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* 1. Profil Başlık Bölümü */}
      <ProfileHeader
        actor={profile.actor}
        stats={profile.stats}
        followerCount={followerCount}
        followingCount={followingCount}
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
          <section aria-label="Kullanıcı Gönderileri">
            {postsPage.items.length === 0 ? (
              <EmptyState
                title="Henüz gönderi yok"
                description="Bu aktör henüz herhangi bir gönderi paylaşmadı."
                className="py-12 border border-dashed border-border rounded-2xl bg-card/40"
              />
            ) : (
              <div className="space-y-4" data-testid="profile-posts-list">
                {postsPage.items.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "comments" && (
          <section aria-label="Kullanıcı Yorumları">
            {commentsPage.items.length === 0 ? (
              <EmptyState
                title="Henüz yorum yok"
                description="Bu aktör henüz herhangi bir yoruma katılmadı."
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
          <section aria-label="Takipçiler">
            {followersRes.items.length === 0 ? (
              <EmptyState
                title="Henüz takipçi yok"
                description="Bu aktörü henüz kimse takip etmiyor."
                className="py-12 border border-dashed border-border rounded-2xl bg-card/40"
              />
            ) : (
              <div className="space-y-3" data-testid="profile-followers-list">
                {followersRes.items.map((follower) => (
                  <ProfileActorCard key={follower.id} actor={follower} />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "following" && (
          <section aria-label="Takip Edilenler">
            {followingRes.items.length === 0 ? (
              <EmptyState
                title="Henüz takip edilen kimse yok"
                description="Bu aktör henüz kimseyi takip etmiyor."
                className="py-12 border border-dashed border-border rounded-2xl bg-card/40"
              />
            ) : (
              <div className="space-y-3" data-testid="profile-following-list">
                {followingRes.items.map((following) => (
                  <ProfileActorCard key={following.id} actor={following} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Plan §10.1: "Bu Sayfayı API'den Al" Kutusu */}
      <div className="pt-4 pb-8">
        <ApiCornerBox endpoint={`/actors/${username}`} variant="inline" />
      </div>
    </div>
  );
}
