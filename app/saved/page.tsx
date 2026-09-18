import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Post } from "actos";
import { ArrowRight, Bookmark, Compass, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SavedStream } from "@/components/saved/saved-stream";
import { Button } from "@/components/ui/button";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { savedQueryOptions } from "@/lib/query/queries";
import { makeServerQueryClient, seedInfinitePage } from "@/lib/query/server";
import type { SavedQueryPage } from "@/lib/query/types";
import { fetchVoteMap, type VoteMap } from "@/lib/votes";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  return { title: `${t("saved.title")} — Actos`, description: t("saved.description") };
}

export const dynamic = "force-dynamic";

interface SavedPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SavedPage(props: SavedPageProps) {
  const { t } = getTranslations(await getServerLocale());
  const rawParams = props.searchParams ? await props.searchParams : {};
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : undefined;

  const client = await getServerClient();

  let viewerId: string | null = null;
  try {
    const whoami = await client.auth.whoami();
    viewerId = whoami?.actor?.id ?? null;
  } catch {
    viewerId = null;
  }
  const isAuthenticated = viewerId !== null;

  // 1. Anonim Durum: Açıkça oturum açma kartı ve /login?returnUrl=/saved bağlantısı sunar (Plan §Faz 9)
  if (!isAuthenticated) {
    return (
      <div
        data-testid="saved-anonymous-card"
        className="py-16 px-4 sm:px-6 max-w-lg mx-auto text-center space-y-6"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-2 border border-border/80 flex items-center justify-center shadow-xs">
          <Bookmark className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground font-serif tracking-tight">
            {t("saved.anon_title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("saved.anon_desc")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild size="default" className="rounded-xl w-full sm:w-auto px-6">
            <Link href="/login?returnUrl=/saved">
              <KeyRound className="w-4 h-4 mr-2" />
              <span>{t("auth.login.submit")}</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="default"
            className="rounded-xl w-full sm:w-auto px-6"
          >
            <Link href="/register">
              <span>{t("auth.register.title")}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // 2. Oturumlu Durum: client.saves.list(...) ile kullanıcının kaydettiği gönderileri listeler
  let posts: Post[] = [];
  let nextCursor: string | null = null;
  let loadError: unknown = null;

  try {
    const savedPage = await client.saves.list({
      cursor,
      limit: 25,
    });
    posts = (savedPage.items || []) as unknown as Post[];
    nextCursor = savedPage.nextCursor ?? null;
  } catch (error) {
    // No fabricated empty state: a failed fetch is not the same thing as
    // "you have nothing saved" (ROADMAP.md P0-02, decision 7).
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

  const queryClient = makeServerQueryClient();
  if (!loadError) {
    const initialPage: SavedQueryPage = { items: posts, nextCursor, votes: voteMap };
    seedInfinitePage(
      queryClient,
      savedQueryOptions(cursor, viewerId).queryKey,
      initialPage,
      cursor ?? null,
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] divide-y divide-border/60">
      <header className="sticky top-14 md:top-0 z-10 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-semibold text-foreground">{t("saved.title")}</h1>
        </div>
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 hover:underline"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{t("saved.back_to_feed")}</span>
        </Link>
      </header>

      {loadError ? (
        <div className="p-6 sm:p-10">
          <ErrorStateRetry {...describeError(loadError)} />
        </div>
      ) : (
        /* Kaydedilenler Akışı, Boş Durum (EmptyState) ve Cursor Sayfalama */
        <HydrationBoundary state={dehydrate(queryClient)}>
          <SavedStream
            initialPosts={posts}
            initialNextCursor={nextCursor}
            initialVotes={voteMap}
            initialCursor={cursor}
            initialViewerId={viewerId}
          />
        </HydrationBoundary>
      )}
    </div>
  );
}
