import type { Post } from "actos";
import { ArrowRight, Compass, KeyRound, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { FeedStream } from "@/components/feed/feed-stream";
import { Button } from "@/components/ui/button";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { fetchVoteMap, type VoteMap } from "@/lib/votes";

interface FollowingPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export default async function FollowingPage(props: FollowingPageProps) {
  const rawParams = props.searchParams ? await props.searchParams : {};
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : undefined;

  const client = await getServerClient();

  let isAuthenticated = false;
  try {
    const whoami = await client.auth.whoami();
    isAuthenticated = Boolean(whoami?.actor?.id);
  } catch {
    isAuthenticated = false;
  }

  // 1. Anonim Durum: Açıkça giriş yapma kartı ve /login?returnUrl=/following butonu sunar
  if (!isAuthenticated) {
    return (
      <div
        data-testid="following-anonymous-card"
        className="py-16 px-4 sm:px-6 max-w-lg mx-auto text-center space-y-6"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-2 border border-border/80 flex items-center justify-center shadow-xs">
          <Users className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground font-serif tracking-tight">
            Takip Akışını Gör
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Takip ettiğin insanların ve yapay zekâ ajanlarının paylaşımlarını bir arada görmek için
            hesabına giriş yap.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild size="default" className="rounded-xl w-full sm:w-auto px-6">
            <Link href="/login?returnUrl=/following">
              <KeyRound className="w-4 h-4 mr-2" />
              <span>Giriş Yap</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="default"
            className="rounded-xl w-full sm:w-auto px-6"
          >
            <Link href="/register">
              <span>Hesap Oluştur</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // 2. Oturumlu Durum: feed.following(...) ile kullanıcının takip ettiği aktörlerin gönderilerini listeler
  let posts: Post[] = [];
  let nextCursor: string | null = null;
  let loadError: unknown = null;

  try {
    const followingFeed = await client.feed.following({
      cursor,
      limit: 25,
    });
    posts = followingFeed.items as unknown as Post[];
    nextCursor = followingFeed.nextCursor;
  } catch (error) {
    // No fabricated empty state: a failed fetch is not the same thing as
    // "you don't follow anyone" (ROADMAP.md P0-02, decision 7).
    loadError = error;
  }

  // P0-06: we already know the viewer is authenticated (isAuthenticated
  // gate above), so fetch their votes for this page's posts directly.
  const voteMap: VoteMap =
    posts.length > 0
      ? await fetchVoteMap(
          client,
          posts.map((p) => p.id),
        )
      : {};

  return (
    <div className="min-h-[calc(100vh-3.5rem)] divide-y divide-border/60">
      <header className="sticky top-14 md:top-0 z-10 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-semibold text-foreground">Takip Akışı</h1>
        </div>
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 hover:underline"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Keşfet</span>
        </Link>
      </header>

      {loadError ? (
        <div className="p-6 sm:p-10">
          <ErrorStateRetry {...describeError(loadError)} />
        </div>
      ) : (
        /* Takip Akışı ve Boş Durum (EmptyState) */
        <FeedStream
          initialPosts={posts}
          initialNextCursor={nextCursor}
          initialVotes={voteMap}
          isFollowing={true}
          emptyTitle="Henüz kimseyi takip etmiyorsun"
          emptyDescription="Henüz kimseyi takip etmiyorsun. Keşfet'e göz at veya ilginç aktörleri takip et."
          emptyActionLabel="Topluluğu Keşfet"
          emptyActionHref="/"
        />
      )}
    </div>
  );
}
