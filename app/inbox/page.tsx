import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { NotificationSummary } from "actos";
import { ArrowRight, Bell, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { InboxFilterTab } from "@/components/inbox/inbox-view";
import { InboxView } from "@/components/inbox/inbox-view";
import { Button } from "@/components/ui/button";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient } from "@/lib/actos";
import { describeError } from "@/lib/errors";
import { inboxQueryOptions } from "@/lib/query/queries";
import { makeServerQueryClient, seedInfinitePage } from "@/lib/query/server";
import type { InboxQueryPage } from "@/lib/query/types";

export const metadata: Metadata = {
  title: "Bildirimler — Actos",
  description: "Hesabınıza gelen yanıtlar, bahsetmeler ve etkileşimler.",
};

export const dynamic = "force-dynamic";

interface InboxPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InboxPage(props: InboxPageProps) {
  const rawParams = props.searchParams ? await props.searchParams : {};
  const cursor = typeof rawParams.cursor === "string" ? rawParams.cursor : undefined;
  const initialFilter: InboxFilterTab = "all";

  const client = await getServerClient();

  let viewerId: string | null = null;
  try {
    const whoami = await client.auth.whoami();
    viewerId = whoami?.actor?.id ?? null;
  } catch {
    viewerId = null;
  }
  const isAuthenticated = viewerId !== null;

  // 1. Anonim Durum: Giriş koruması [A] (Plan §Faz 13)
  // Açıkça oturum açma kartı ve /login?returnUrl=/inbox yönlendirmesi sunar
  if (!isAuthenticated) {
    return (
      <div
        data-testid="inbox-anonymous-card"
        className="py-16 px-4 sm:px-6 max-w-lg mx-auto text-center space-y-6"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-2 border border-border/80 flex items-center justify-center shadow-xs">
          <Bell className="w-7 h-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground font-serif tracking-tight">
            Bildirimler
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Gönderilerinize gelen yanıtları, bahsetmeleri ve yeni takipçileri görmek için hesabınıza
            giriş yapın.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            asChild
            size="default"
            className="rounded-xl w-full sm:w-auto px-6 cursor-pointer"
          >
            <Link href="/login?returnUrl=/inbox">
              <KeyRound className="w-4 h-4 mr-2" />
              <span>Giriş Yap</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="default"
            className="rounded-xl w-full sm:w-auto px-6 cursor-pointer"
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

  // 2. Oturumlu Durum: client.inbox.list(...) ile bildirimleri çeker
  let notifications: NotificationSummary[] = [];
  let nextCursor: string | null = null;
  let unreadCount = 0;
  let loadError: unknown = null;

  try {
    const res = await client.inbox.list({
      cursor,
      limit: 25,
    });
    notifications = res.notifications || [];
    nextCursor = res.nextCursor ?? null;
    unreadCount = res.unreadCount ?? 0;
  } catch (error) {
    // No fabricated notifications (ROADMAP.md P0-02, decision 7): render an
    // error state with retry instead.
    loadError = error;
  }

  if (loadError) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto">
        <ErrorStateRetry {...describeError(loadError)} />
      </div>
    );
  }

  const queryClient = makeServerQueryClient();
  const initialPage: InboxQueryPage = {
    notifications,
    nextCursor,
    unreadCount,
  };
  seedInfinitePage(
    queryClient,
    inboxQueryOptions(initialFilter, cursor, viewerId).queryKey,
    initialPage,
    cursor ?? null,
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <InboxView
          initialFilter={initialFilter}
          initialCursor={cursor}
          initialViewerId={viewerId}
        />
      </HydrationBoundary>
    </div>
  );
}
