"use client";

import { CheckCheck, Inbox, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { NotificationCard, type NotificationRow } from "@/components/inbox/notification-card";
import { LoadMore } from "@/components/pagination/load-more";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";

export type InboxFilterTab = "all" | "unread" | "replies" | "mentions";

export interface InboxViewProps {
  initialNotifications: NotificationRow[];
  initialNextCursor?: string | null;
  initialUnreadCount?: number;
}

export function InboxView({
  initialNotifications,
  initialNextCursor = null,
  initialUnreadCount = 0,
}: InboxViewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<InboxFilterTab>("all");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [_isPending, startTransition] = useTransition();

  const unreadCount = useSessionStore((state) => state.unreadCount);
  const setUnreadCount = useSessionStore((state) => state.setUnreadCount);

  // Sync initial unread count to session store upon mounting
  useEffect(() => {
    if (initialUnreadCount !== undefined) {
      setUnreadCount(initialUnreadCount);
    }
  }, [initialUnreadCount, setUnreadCount]);

  // Tab change handler
  const handleTabChange = async (tab: string) => {
    const filter = tab as InboxFilterTab;
    setActiveTab(filter);

    startTransition(async () => {
      try {
        const query = new URLSearchParams();
        query.set("filter", filter);
        if (filter === "unread") {
          query.set("unread", "true");
        }
        const res = await fetch(`/api/inbox?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setNextCursor(data.nextCursor ?? null);
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
          }
        } else {
          // Keep showing the previously loaded notifications rather than
          // substituting fabricated data (ROADMAP.md decision 7).
          toast.error(t("states.inboxLoadFailed"));
        }
      } catch {
        toast.error(t("states.inboxLoadFailed"));
      }
    });
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;

    setIsMarkingAll(true);
    const prevNotifications = [...notifications];
    const prevUnreadCount = unreadCount;

    // Optimistically mark all loaded notifications as read
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        readAt: item.readAt || nowIso,
      })),
    );
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
        setNotifications(prevNotifications);
        setUnreadCount(prevUnreadCount);
        toast.error("Bildirimler okundu olarak işaretlenemedi.");
      }
    } catch {
      // Revert on serious network failure
      setNotifications(prevNotifications);
      setUnreadCount(prevUnreadCount);
      toast.error("Bildirimler okundu olarak işaretlenemedi.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Load more via keyset cursor pagination
  const handleLoadMore = async (cursor: string) => {
    if (!cursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const query = new URLSearchParams();
      query.set("cursor", cursor);
      query.set("filter", activeTab);
      if (activeTab === "unread") {
        query.set("unread", "true");
      }

      const res = await fetch(`/api/inbox?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newItems = data.notifications || [];
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const freshItems = newItems.filter((n: NotificationRow) => !existingIds.has(n.id));
          return [...prev, ...freshItems];
        });
        setNextCursor(data.nextCursor ?? null);
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      } else {
        toast.error(t("states.inboxLoadFailed"));
      }
    } catch {
      toast.error(t("states.inboxLoadFailed"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Callback when a single notification is marked as read
  const handleSingleRead = (id: string) => {
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, readAt: nowIso } : item)),
    );
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
              onLoadMore={handleLoadMore}
              isLoading={isLoadingMore}
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
