"use client";

import { type InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Inbox, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getNotificationPresentation,
  NotificationCard,
  type NotificationRow,
} from "@/components/inbox/notification-card";
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

export type InboxFilterTab = "all" | "replies" | "mentions" | "follows";

export interface InboxViewProps {
  initialNotifications?: NotificationRow[];
  initialNextCursor?: string | null;
  initialUnreadCount?: number;
  initialFilter?: InboxFilterTab;
  initialCursor?: string;
  initialViewerId?: string | null;
}

interface NotificationDayGroup {
  key: string;
  label: string;
  notifications: NotificationRow[];
}

function getUtcDayKey(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
}

function groupNotificationsByDay(
  items: NotificationRow[],
  locale: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): NotificationDayGroup[] {
  const groups = new Map<string, NotificationDayGroup>();
  const today = new Date();
  const todayKey = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
  const yesterday = new Date(`${todayKey}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  for (const notification of items) {
    const key = getUtcDayKey(notification.createdAt);
    let group = groups.get(key);
    if (!group) {
      const date = new Date(`${key}T00:00:00.000Z`);
      const label =
        key === "unknown"
          ? t("inbox.days.unknown")
          : key === todayKey
            ? t("inbox.days.today")
            : key === yesterdayKey
              ? t("inbox.days.yesterday")
              : new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(date);
      group = { key, label, notifications: [] };
      groups.set(key, group);
    }
    group.notifications.push(notification);
  }

  return [...groups.values()];
}

export function InboxView({
  initialNotifications,
  initialNextCursor = null,
  initialUnreadCount = 0,
  initialFilter = "all",
  initialCursor,
  initialViewerId,
}: InboxViewProps) {
  const { t, locale } = useTranslation();
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
        toast.success(t("inbox.marked_all_success"));
      } else {
        // The write did not actually happen: undo the optimistic update
        // instead of reporting success (ROADMAP.md decision 7).
        for (const [key, data] of snapshots) queryClient.setQueryData(key, data);
        if (useSessionStore.getState().user?.id === viewerId) setUnreadCount(prevUnreadCount);
        toast.error(t("states.notificationReadFailed"));
      }
    } catch {
      // Revert on serious network failure
      for (const [key, data] of snapshots) queryClient.setQueryData(key, data);
      if (useSessionStore.getState().user?.id === viewerId) setUnreadCount(prevUnreadCount);
      toast.error(t("states.notificationReadFailed"));
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
  const displayItems = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    return getNotificationPresentation(notification.kind).category === activeTab;
  });
  const dayGroups = groupNotificationsByDay(displayItems, locale, t);

  return (
    <div className="space-y-6">
      {/* Başlık Bölümü */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold font-serif tracking-tight text-foreground flex items-center gap-2.5">
            <span>{t("inbox.title")}</span>
            {unreadCount > 0 && (
              <span
                data-testid="inbox-header-badge"
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-2xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}{" "}
                {t("inbox.unread").toLocaleLowerCase(locale)}
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("inbox.description")}</p>
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
          <span>{t("inbox.mark_all_read")}</span>
        </Button>
      </div>

      {/* Filtre Sekmeleri */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
          <TabsList className="bg-surface-2/80 p-1 rounded-xl border border-border/60">
            <TabsTrigger
              value="all"
              data-testid="tab-all"
              onClick={() => handleTabChange("all")}
              className="rounded-lg text-xs font-medium px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              {t("inbox.tabs.all")}
            </TabsTrigger>
            <TabsTrigger
              value="replies"
              data-testid="tab-replies"
              onClick={() => handleTabChange("replies")}
              className="rounded-lg text-xs font-medium px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              {t("inbox.tabs.replies")}
            </TabsTrigger>
            <TabsTrigger
              value="mentions"
              data-testid="tab-mentions"
              onClick={() => handleTabChange("mentions")}
              className="rounded-lg text-xs font-medium px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              {t("inbox.tabs.mentions")}
            </TabsTrigger>
            <TabsTrigger
              value="follows"
              data-testid="tab-follows"
              onClick={() => handleTabChange("follows")}
              className="rounded-lg text-xs font-medium px-3.5 py-1.5 cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              {t("inbox.tabs.follows")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Bildirimler Listesi */}
      <div className="space-y-7" data-testid="inbox-list">
        {displayItems.length > 0 ? (
          dayGroups.map((group) => (
            <section
              key={group.key}
              data-testid="notification-day-group"
              data-day={group.key}
              aria-label={group.label}
              className="space-y-3"
            >
              <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group.label}
              </h2>
              <div className="space-y-2.5">
                {group.notifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onRead={handleSingleRead}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          /* Boş Durum (EmptyState) */
          <div className="py-8">
            <EmptyState
              icon={Inbox}
              title={t("inbox.empty.title")}
              description={t("inbox.empty.description")}
              action={{
                label: t("inbox.empty.action"),
                href: "/",
              }}
            />
          </div>
        )}

        {/* A filtered page can be empty while later cursor pages still contain matches. */}
        <LoadMore
          nextCursor={nextCursor}
          hasMore={Boolean(nextCursor)}
          onLoadMore={async () => {
            const result = await inbox.fetchNextPage();
            if (result.isFetchNextPageError) toast.error(t("states.inboxLoadFailed"));
          }}
          isLoading={inbox.isFetchingNextPage}
          syncUrl={false}
          label={t("inbox.load_more")}
          loadingLabel={t("inbox.loading")}
        />
      </div>
    </div>
  );
}
