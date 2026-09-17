"use client";

import { type InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Inbox, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NotificationCard, type NotificationRow } from "@/components/inbox/notification-card";
import { LoadMore } from "@/components/pagination/load-more";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { queryKeys } from "@/lib/query/keys";
import { inboxQueryOptions } from "@/lib/query/queries";
import type { InboxQueryPage } from "@/lib/query/types";
import { useSessionStore } from "@/lib/stores/session-store";

export type InboxFilterTab = "all" | "unread" | "replies" | "mentions";

export interface InboxViewProps {
  initialNotifications?: NotificationRow[];
  initialNextCursor?: string | null;
  initialUnreadCount?: number;
  initialFilter?: InboxFilterTab;
  initialCursor?: string;
  initialViewerId?: string | null;
}

export function InboxView({
  initialNotifications,
  initialNextCursor = null,
  initialUnreadCount = 0,
  initialFilter = "all",
  initialCursor,
  initialViewerId,
}: InboxViewProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<InboxFilterTab>(initialFilter);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const authStatus = useSessionStore((state) => state.status);
  const sessionUserId = useSessionStore((state) => state.user?.id ?? null);
  const viewerId =
    authStatus === "authenticated"
      ? (sessionUserId ?? initialViewerId ?? null)
      : authStatus === "unauthenticated"
        ? null
        : (initialViewerId ?? null);
  const initialStateMatchesViewer = initialViewerId === undefined || initialViewerId === viewerId;
  const viewerCacheId = viewerId ?? "anonymous";

  const compatibilityInitialData =
    initialNotifications === undefined
      ? undefined
      : {
          pages: [
            {
              notifications: initialNotifications,
              nextCursor: initialNextCursor,
              unreadCount: initialUnreadCount,
            } satisfies InboxQueryPage,
          ],
          pageParams: [initialCursor ?? null],
        };
  const inbox = useInfiniteQuery({
    ...inboxQueryOptions(
      activeTab,
      activeTab === initialFilter ? initialCursor : undefined,
      viewerId,
    ),
    initialData:
      initialStateMatchesViewer && activeTab === initialFilter
        ? compatibilityInitialData
        : undefined,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === viewerCacheId ? previousData : undefined,
  });
  const notifications = inbox.data?.pages.flatMap((page) => page.notifications) ?? [];
  const nextCursor = inbox.data?.pages.at(-1)?.nextCursor ?? null;
  const pageUnreadCount = inbox.data?.pages.at(-1)?.unreadCount;

  const unreadCount = useSessionStore((state) => state.unreadCount);
  const setUnreadCount = useSessionStore((state) => state.setUnreadCount);

  useEffect(() => {
    if (typeof pageUnreadCount === "number") setUnreadCount(pageUnreadCount);
  }, [pageUnreadCount, setUnreadCount]);

  const updateInboxCaches = (updater: (page: InboxQueryPage) => InboxQueryPage) => {
    const matches = queryClient.getQueriesData<InfiniteData<InboxQueryPage, string | null>>({
      queryKey: queryKeys.inbox.all,
      predicate: (query) => query.queryKey[2] === viewerCacheId,
    });
    for (const [key, cached] of matches) {
      if (!cached) continue;
      queryClient.setQueryData<InfiniteData<InboxQueryPage, string | null>>(key, {
        ...cached,
        pages: cached.pages.map(updater),
      });
    }
  };

  // Tab change handler
  const handleTabChange = async (tab: string) => {
    const filter = tab as InboxFilterTab;
    setActiveTab(filter);
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;

    setIsMarkingAll(true);
    const prevUnreadCount = unreadCount;
    const nowIso = new Date().toISOString();
    const snapshots = queryClient.getQueriesData<InfiniteData<InboxQueryPage, string | null>>({
      queryKey: queryKeys.inbox.all,
      predicate: (query) => query.queryKey[2] === viewerCacheId,
    });
    updateInboxCaches((page) => ({
      ...page,
      notifications: page.notifications.map((item) => ({
        ...item,
        readAt: item.readAt || nowIso,
      })),
      unreadCount: 0,
    }));
    setUnreadCount(0);

    try {
      const res = await fetch("/api/inbox/read-all", {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Tüm bildirimler okundu olarak işaretlendi.");
      } else {
        // The write did not actually happen: undo the optimistic update
        // instead of reporting success (ROADMAP.md decision 7).
        for (const [key, data] of snapshots) queryClient.setQueryData(key, data);
        if (useSessionStore.getState().user?.id === viewerId) setUnreadCount(prevUnreadCount);
        toast.error("Bildirimler okundu olarak işaretlenemedi.");
      }
    } catch {
      // Revert on serious network failure
      for (const [key, data] of snapshots) queryClient.setQueryData(key, data);
      if (useSessionStore.getState().user?.id === viewerId) setUnreadCount(prevUnreadCount);
      toast.error("Bildirimler okundu olarak işaretlenemedi.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Callback when a single notification is marked as read
  const handleSingleRead = (id: string) => {
    const nowIso = new Date().toISOString();
    updateInboxCaches((page) => ({
      ...page,
      notifications: page.notifications.map((item) =>
        item.id === id ? { ...item, readAt: nowIso } : item,
      ),
    }));
  };

  // Filtered view items
  const displayItems = notifications.filter((n) => {
    if (activeTab === "unread") return !n.readAt;
    if (activeTab === "replies") {
      return n.kind === "reply" || n.kind === "comment_on_post" || n.kind === "reply_to_comment";
    }
    if (activeTab === "mentions") return n.kind === "mention";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Başlık Bölümü */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold font-serif tracking-tight text-foreground flex items-center gap-2.5">
            <span>Bildirimler</span>
            {unreadCount > 0 && (
              <span
                data-testid="inbox-header-badge"
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-2xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount} okunmamış
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Hesabınıza gelen yanıtlar, bahsetmeler ve topluluk etkileşimleri.
          </p>
        </div>

        {/* "Tümünü Okundu İşaretle" Butonu */}
        <Button
          type="button"
          data-testid="mark-all-read-button"
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={isMarkingAll || unreadCount === 0}
          className="rounded-xl self-start sm:self-auto gap-2 border-border/80 shadow-2xs cursor-pointer hover:bg-surface-2"
        >
          {isMarkingAll ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : (
            <CheckCheck className="w-3.5 h-3.5 text-primary" />
          )}
          <span>Tümünü Okundu İşaretle</span>
        </Button>
      </div>

      {/* Filtre Sekmeleri: Tümü, Okunmamış, Yanıtlar, Bahsetmeler */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
          <TabsList className="bg-surface-2/80 p-1 rounded-xl border border-border/60">
            <TabsTrigger
              value="all"
              data-testid="tab-all"
              onClick={() => handleTabChange("all")}
              className="rounded-lg text-xs font-medium px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Tümü
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              data-testid="tab-unread"
              onClick={() => handleTabChange("unread")}
              className="rounded-lg text-xs font-medium px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <span>Okunmamış</span>
              {unreadCount > 0 && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground font-mono font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="replies"
              data-testid="tab-replies"
              onClick={() => handleTabChange("replies")}
              className="rounded-lg text-xs font-medium px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Yanıtlar
            </TabsTrigger>
            <TabsTrigger
              value="mentions"
              data-testid="tab-mentions"
              onClick={() => handleTabChange("mentions")}
              className="rounded-lg text-xs font-medium px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Bahsetmeler
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Bildirimler Listesi */}
      <div className="space-y-3" data-testid="inbox-list">
        {displayItems.length > 0 ? (
          <>
            {displayItems.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onRead={handleSingleRead}
              />
            ))}

            {/* Keyset Cursor Sayfalama */}
            <LoadMore
              nextCursor={nextCursor}
              hasMore={Boolean(nextCursor)}
              onLoadMore={async () => {
                const result = await inbox.fetchNextPage();
                if (result.isFetchNextPageError) toast.error(t("states.inboxLoadFailed"));
              }}
              isLoading={inbox.isFetchingNextPage}
              syncUrl={false}
              label="Daha fazla bildirim yükle"
              loadingLabel="Bildirimler yükleniyor..."
            />
          </>
        ) : (
          /* Boş Durum (EmptyState) */
          <div className="py-8">
            <EmptyState
              icon={Inbox}
              title={
                activeTab === "unread" ? "Okunmamış bildiriminiz yok" : "Henüz bir bildiriminiz yok"
              }
              description={
                activeTab === "unread"
                  ? "Tüm bildirimlerinizi okudunuz. Yeni bir etkileşim olduğunda burada görünecektir."
                  : "Gönderileriniz etkileşim aldığında burada göreceksiniz."
              }
              action={{
                label: "Akışa Göz At",
                href: "/",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
