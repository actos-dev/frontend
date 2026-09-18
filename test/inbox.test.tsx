// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import { GoneError } from "actos";
import { NextRequest } from "next/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as readRoute from "@/app/api/inbox/[id]/read/route";
import PostDetailPage from "@/app/posts/[id]/[[...slug]]/page";
import { InboxView } from "@/components/inbox/inbox-view";
import type { NotificationRow } from "@/components/inbox/notification-card";
import { NotificationCard } from "@/components/inbox/notification-card";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { toast } from "@/components/ui/toast";
import * as actosLib from "@/lib/actos";
import { useInboxPoll } from "@/lib/hooks/use-inbox-poll";
import { useSessionStore } from "@/lib/stores/session-store";
import { MOCK_USERS } from "@/test/fixtures/users";

function render(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/inbox",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  permanentRedirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`);
    (error as unknown as { digest: string }).digest = `NEXT_REDIRECT:${url}`;
    throw error;
  }),
}));

// Mock Sonner toast
vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Component wrapper for testing useInboxPoll
function PollTestConsumer(props: {
  activeInterval?: number;
  hiddenInterval?: number;
  onCountUpdated?: (count: number) => void;
}) {
  useInboxPoll(props);
  return <div data-testid="poll-consumer">polling active</div>;
}

describe("Faz 13 — Bildirimler (Inbox) Test Paketi", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({
      user: MOCK_USERS.humanUser,
      unreadCount: 3,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  /* ==========================================================================
     1. Bildirim Türleri ve Render Edilme
     ========================================================================== */
  describe("1. Bildirim Türlerinin Doğru Render Edilmesi", () => {
    it("reply / comment_on_post türünü aktör bilgisi, ikon ve eylem metniyle render etmelidir", () => {
      const replyNotif: NotificationRow = {
        id: "n_reply_test",
        kind: "comment_on_post",
        actor: {
          id: "usr_1",
          username: "taylan_mod",
          displayName: "Taylan",
          actorType: "human",
        },
        targetType: "content",
        targetId: "c_post_1",
        payload: { body: "Harika bir mimari yaklaşım!" },
        createdAt: "2026-09-04T12:00:00Z",
        readAt: null,
      };

      render(<NotificationCard notification={replyNotif} />);

      expect(screen.getByText("Taylan")).toBeDefined();
      expect(screen.getByText("replied to your post")).toBeDefined();
      expect(screen.getByText("Harika bir mimari yaklaşım!")).toBeDefined();
      expect(screen.getByTestId("unread-indicator")).toBeDefined();

      const link = screen.getByTestId("notification-card");
      expect(link.getAttribute("href")).toBe("/posts/c_post_1");
    });

    it("reply_to_comment türünü 'yorumunuza yanıt verdi' metniyle render etmelidir", () => {
      const replyToCommentNotif: NotificationRow = {
        id: "n_reply_comment_test",
        kind: "reply_to_comment",
        actor: {
          id: "usr_2",
          username: "dila_ai",
          displayName: "Dila AI",
          actorType: "ai_agent",
        },
        targetType: "content",
        targetId: "c_comment_2",
        payload: { body: "Yorumuna katılıyorum." },
        createdAt: "2026-09-04T12:00:00Z",
        readAt: "2026-09-04T12:30:00Z",
      };

      render(<NotificationCard notification={replyToCommentNotif} />);

      expect(screen.getByText("Dila AI")).toBeDefined();
      expect(screen.getByText("replied to your comment")).toBeDefined();
      expect(screen.getByText("Yorumuna katılıyorum.")).toBeDefined();
      expect(screen.queryByTestId("unread-indicator")).toBeNull();
    });

    it("mention türünü 'sizden bahsetti' metniyle ve @alıntıyla render etmelidir", () => {
      const mentionNotif: NotificationRow = {
        id: "n_mention_test",
        kind: "mention",
        actor: {
          id: "usr_3",
          username: "efe",
          displayName: "Efe",
          actorType: "human",
        },
        targetType: "content",
        targetId: "c_post_3",
        payload: { body: "@taylan_mod bu konuda fikrin nedir?" },
        createdAt: "2026-09-04T12:00:00Z",
        readAt: null,
      };

      render(<NotificationCard notification={mentionNotif} />);

      expect(screen.getByText("Efe")).toBeDefined();
      expect(screen.getByText("mentioned you")).toBeDefined();
      expect(screen.getByText("@taylan_mod bu konuda fikrin nedir?")).toBeDefined();
    });

    it("vote türünü 'gönderinizi beğendi' metniyle render etmelidir", () => {
      const voteNotif: NotificationRow = {
        id: "n_vote_test",
        kind: "vote",
        actor: {
          id: "usr_4",
          username: "taylan_mod",
          displayName: "Taylan",
          actorType: "human",
        },
        targetType: "content",
        targetId: "c_post_1",
        payload: {},
        createdAt: "2026-09-04T12:00:00Z",
        readAt: "2026-09-04T12:00:00Z",
      };

      render(<NotificationCard notification={voteNotif} />);

      expect(screen.getByText("Taylan")).toBeDefined();
      expect(screen.getByText("liked your post")).toBeDefined();
    });

    it("follow / new_follower türünü 'sizi takip etmeye başladı' ve profil bağlantısıyla render etmelidir", () => {
      const followNotif: NotificationRow = {
        id: "n_follow_test",
        kind: "new_follower",
        actor: {
          id: "usr_5",
          username: "dila_ai",
          displayName: "Dila AI",
          actorType: "ai_agent",
        },
        targetType: "actor",
        targetId: "usr_human_1",
        payload: {},
        createdAt: "2026-09-04T12:00:00Z",
        readAt: null,
      };

      render(<NotificationCard notification={followNotif} />);

      expect(screen.getByText("Dila AI")).toBeDefined();
      expect(screen.getByText("started following you")).toBeDefined();
      const link = screen.getByTestId("notification-card");
      expect(link.getAttribute("href")).toBe("/u/dila_ai");
    });

    it("system / moderation_action türünü 'Sistem' başlığı ve açıklamayla render etmelidir", () => {
      const sysNotif: NotificationRow = {
        id: "n_system_test",
        kind: "moderation_action",
        actor: null,
        targetType: "content",
        targetId: "c_post_9",
        payload: { reason: "Topluluk kurallarına uyum incelemesi tamamlandı." },
        createdAt: "2026-09-04T12:00:00Z",
        readAt: "2026-09-04T12:00:00Z",
      };

      render(<NotificationCard notification={sysNotif} />);

      expect(screen.getByText("System")).toBeDefined();
      expect(screen.getByText("system notification")).toBeDefined();
      expect(screen.getByText("Topluluk kurallarına uyum incelemesi tamamlandı.")).toBeDefined();
    });

    it("bilinmeyen tür ve boş payload için uydurma ayrıntı yerine genel metin göstermelidir", () => {
      const unknownNotif: NotificationRow = {
        id: "n_unknown_test",
        kind: "future_kind",
        actor: { id: "usr_future", username: "future_actor", actorType: "human" },
        targetType: "content",
        targetId: "c_future",
        payload: {},
        createdAt: "2026-09-04T12:00:00Z",
        readAt: null,
      };

      render(<NotificationCard notification={unknownNotif} />);

      expect(screen.getByText("You have a new notification.")).toBeDefined();
      expect(screen.queryByTestId("notification-excerpt")).toBeNull();
      expect(screen.queryByTestId("mark-read-button")).toBeNull();
      expect(screen.queryByText("Detayları gör →")).toBeNull();
    });
  });

  /* ==========================================================================
     2. Okunmamış Bildirim Vurgusu ve unreadCount Rozet Testi
     ========================================================================== */
  describe("2. Okunmamış Bildirim Vurgusu ve Rozetler", () => {
    it("okunmamış kartta vurgulu stil, indicator ve data-read='false' bulunmalıdır", () => {
      const unreadNotif: NotificationRow = {
        id: "n_unread_1",
        kind: "comment_on_post",
        actor: { id: "1", username: "efe", actorType: "human" },
        targetType: "content",
        targetId: "c_1",
        payload: {},
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      render(<NotificationCard notification={unreadNotif} />);
      const card = screen.getByTestId("notification-card");
      expect(card.getAttribute("data-read")).toBe("false");
      expect(screen.getByTestId("unread-indicator")).toBeDefined();
    });

    it("Sidebar bileşeninde unreadCount > 0 iken doğru rozet basılmalıdır", () => {
      render(<Sidebar user={MOCK_USERS.humanUser} unreadCount={3} />);
      const badge = screen.getByTestId("inbox-badge");
      expect(badge.textContent).toBe("3");
    });

    it("Sidebar bileşeninde unreadCount > 99 iken '99+' rozeti basılmalıdır", () => {
      render(<Sidebar user={MOCK_USERS.humanUser} unreadCount={150} />);
      const badge = screen.getByTestId("inbox-badge");
      expect(badge.textContent).toBe("99+");
    });

    it("MobileNav bileşeninde unreadCount > 0 iken mobil rozet basılmalıdır", () => {
      render(<MobileNav />);
      const badge = screen.getByTestId("mobile-inbox-badge");
      expect(badge.textContent).toBe("3");
    });

    it("MobileNav bileşeninde unreadCount > 99 iken '99+' rozeti basılmalıdır", () => {
      useSessionStore.setState({ unreadCount: 105 });
      render(<MobileNav />);
      const badge = screen.getByTestId("mobile-inbox-badge");
      expect(badge.textContent).toBe("99+");
    });
  });

  /* ==========================================================================
     3. Tekil Okundu İşaretleme Etkileşimi ve Sayacın Düşmesi
     ========================================================================== */
  describe("3. Bildirimi Açınca Okundu İşaretleme", () => {
    it("okunmamış bildirim satırı açıldığında PATCH /api/inbox/[id]/read çağırmalı ve unreadCount 1 azalmalıdır", async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      global.fetch = mockFetch;

      useSessionStore.setState({ unreadCount: 3 });

      const notif: NotificationRow = {
        id: "n_to_read_1",
        kind: "comment_on_post",
        actor: { id: "1", username: "efe", actorType: "human" },
        targetType: "content",
        targetId: "c_1",
        payload: {},
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      const handleRead = vi.fn();
      render(<NotificationCard notification={notif} onRead={handleRead} />);

      const row = screen.getByTestId("notification-card");
      expect(row.getAttribute("href")).toBe("/posts/c_1");

      await act(async () => {
        fireEvent.click(row);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/inbox/n_to_read_1/read",
        expect.objectContaining({ method: "PATCH" }),
      );

      // Kart artık okundu durumuna geçmeli
      const card = screen.getByTestId("notification-card");
      expect(card.getAttribute("data-read")).toBe("true");

      // Session store sayacı 3'ten 2'ye inmeli
      expect(useSessionStore.getState().unreadCount).toBe(2);
      expect(handleRead).toHaveBeenCalledWith("n_to_read_1");
    });

    it("PATCH başarısız (non-2xx) döndüğünde iyimser okundu durumunu ve sayacı geri almalı, hata tostu göstermelidir (ROADMAP.md P0-02)", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "INTERNAL" }), {
          status: 500,
        }),
      );
      global.fetch = mockFetch;

      useSessionStore.setState({ unreadCount: 3 });

      const notif: NotificationRow = {
        id: "n_fail_read_1",
        kind: "comment_on_post",
        actor: { id: "1", username: "efe", actorType: "human" },
        targetType: "content",
        targetId: "c_1",
        payload: {},
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      const handleRead = vi.fn();
      render(<NotificationCard notification={notif} onRead={handleRead} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId("notification-card"));
      });

      // The write did not actually happen: the card must revert to unread
      // instead of pretending it succeeded.
      const card = screen.getByTestId("notification-card");
      expect(card.getAttribute("data-read")).toBe("false");
      expect(useSessionStore.getState().unreadCount).toBe(3);
      expect(handleRead).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe("3b. PATCH /api/inbox/[id]/read Route Handler", () => {
    it("backend çağrısı başarısız olduğunda sahte 204 yerine haritalanmış hatayı döndürmelidir (ROADMAP.md P0-02)", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        inbox: {
          read: vi.fn().mockRejectedValue({ status: 503, code: "NETWORK_ERROR" }),
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/inbox/n_1/read", {
        method: "PATCH",
      });
      const res = await readRoute.PATCH(req, { params: Promise.resolve({ id: "n_1" }) });

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.code).toBe("NETWORK_ERROR");
    });
  });

  /* ==========================================================================
     4. Tümünü Okundu İşaretle Butonu ve Sayacın Sıfırlanması
     ========================================================================== */
  describe("4. Tümünü Okundu İşaretleme (POST /api/inbox/read-all)", () => {
    it("butona tıklandığında POST /api/inbox/read-all çağrılmalı, unreadCount 0 olmalı ve toast gösterilmelidir", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ ok: true, marked: 2 }), { status: 200 }));
      global.fetch = mockFetch;

      const items = [
        {
          id: "n_1",
          kind: "comment_on_post",
          actor: { id: "1", username: "efe", actorType: "human" as const },
          targetType: "content",
          targetId: "c_1",
          payload: {},
          createdAt: new Date().toISOString(),
          readAt: null,
        },
        {
          id: "n_2",
          kind: "mention",
          actor: { id: "2", username: "taylan", actorType: "human" as const },
          targetType: "content",
          targetId: "c_2",
          payload: {},
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      ];

      useSessionStore.setState({ unreadCount: 2 });

      render(
        <InboxView initialNotifications={items} initialNextCursor={null} initialUnreadCount={2} />,
      );

      const markAllBtn = screen.getByTestId("mark-all-read-button");
      expect(markAllBtn).toBeDefined();

      await act(async () => {
        fireEvent.click(markAllBtn);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/inbox/read-all",
        expect.objectContaining({ method: "POST" }),
      );

      // Sayaç 0 olmalı
      expect(useSessionStore.getState().unreadCount).toBe(0);

      // Toast çağrısı yapılmış olmalı
      expect(toast.success).toHaveBeenCalledWith("All notifications marked as read.");

      // Ekrandaki kartların indicator'ları kaybolmalı
      const indicators = screen.queryAllByTestId("unread-indicator");
      expect(indicators.length).toBe(0);
    });
  });

  /* ==========================================================================
     5. Görünürlük Durumuna (document.visibilityState) Göre Akıllı Yoklama
     ========================================================================== */
  describe("5. Akıllı Yoklama / Polling (useInboxPoll)", () => {
    it("sekme aktifken belirtilen aralıkta (30s) periyodik yoklama yapmalıdır", async () => {
      vi.useFakeTimers();

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, unread_count: 5, unreadCount: 5 }), {
          status: 200,
        }),
      );
      global.fetch = mockFetch;

      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
        configurable: true,
      });

      const onUpdate = vi.fn();
      render(
        <PollTestConsumer
          activeInterval={30_000}
          hiddenInterval={120_000}
          onCountUpdated={onUpdate}
        />,
      );

      // 1. İlk anlık yoklama (mount)
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 2. 30 saniye ilerlet
      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // 3. Bir 30 saniye daha ilerlet
      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("sekme arka plandayken (hidden) yoklama aralığı 120 saniyeye yavaşlamalıdır", async () => {
      vi.useFakeTimers();

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, unread_count: 5, unreadCount: 5 }), {
          status: 200,
        }),
      );
      global.fetch = mockFetch;

      // Sekme arka planda
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });

      render(<PollTestConsumer activeInterval={30_000} hiddenInterval={120_000} />);

      // İlk anlık çağrı
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 30 saniye sonra çağrılmamalı (çünkü hidden süresi 120s)
      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 120 saniyeyi tamamla (toplam 120s)
      await act(async () => {
        vi.advanceTimersByTime(90_000);
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("sekme hidden'dan visible'a geçtiğinde anında taze yoklama yapmalı ve aktif aralığa dönmelidir", async () => {
      vi.useFakeTimers();

      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, unread_count: 7, unreadCount: 7 }), {
          status: 200,
        }),
      );
      global.fetch = mockFetch;

      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
        configurable: true,
      });

      render(<PollTestConsumer activeInterval={30_000} hiddenInterval={120_000} />);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Sekmeye geri dönüldü (visible)
      await act(async () => {
        Object.defineProperty(document, "visibilityState", {
          value: "visible",
          writable: true,
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // Anında taze çağrı yapılmalıdır
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // 30 saniye sonra bir kez daha aktif periyotta çağrılmalıdır
      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  /* ==========================================================================
     6. Hedefi Silinmiş Bildirim ve 410 Ekranına Güvenli Yönlendirme (YAPILACAKLAR.md §3)
     ========================================================================== */
  describe("6. Hedefi Silinmiş Bildirim Sözleşmesi", () => {
    it("hedefi silinmiş bildirim tıklandığında hedef linki post sayfasına yönlendirir", () => {
      const deletedTargetNotif: NotificationRow = {
        id: "n_deleted_post_target",
        kind: "comment_on_post",
        actor: { id: "1", username: "taylan_mod", actorType: "human" },
        targetType: "content",
        targetId: "c_deleted_post_99",
        payload: { body: "Silinmiş posta yorum" },
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      render(<NotificationCard notification={deletedTargetNotif} />);

      const targetLink = screen.getByTestId("notification-card");
      expect(targetLink.getAttribute("href")).toBe("/posts/c_deleted_post_99");

      // Bildirim kartı listede durmaya devam eder (silinmez / kaybolmaz)
      expect(screen.getByTestId("notification-card")).toBeDefined();
    });

    it("silinmiş post hedefi açıldığında PostDetailPage 410 Gone ekranını render etmelidir", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        posts: {
          get: vi.fn().mockRejectedValue(new GoneError({ status: 410 })),
        },
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("Anon")),
        },
      } as unknown as actosLib.Actos);

      const pageResult = await PostDetailPage({
        params: Promise.resolve({ id: "c_deleted_post_99" }),
      });

      render(pageResult);

      // 410 İçerik Silindi başlığı ve İlke 7 kutusu render edilmelidir
      expect(screen.getByText("Bu içerik silindi")).toBeDefined();
      expect(screen.getByText("410 · Silinmiş İçerik")).toBeDefined();
      expect(screen.getByText(/İlke 7: Silinmiş ≠ Hiç Olmamış/i)).toBeDefined();
    });
  });

  /* ==========================================================================
     7. Boş Durum (EmptyState) ve Sekme Filtreleme
     ========================================================================== */
  describe("7. Sekme Filtreleme ve Boş Durumlar", () => {
    it("bildirim listesi boş olduğunda EmptyState render etmelidir", () => {
      render(
        <InboxView initialNotifications={[]} initialNextCursor={null} initialUnreadCount={0} />,
      );

      expect(screen.getByText("You have no notifications yet")).toBeDefined();
      expect(
        screen.getByText("When your posts receive engagement, you will see them here."),
      ).toBeDefined();
    });

    it("Yanıtlar sekmesi seçildiğinde sadece yanıt bildirimleri filtrelenmelidir", async () => {
      const mockItems: NotificationRow[] = [
        {
          id: "n_rep_1",
          kind: "comment_on_post",
          actor: { id: "1", username: "taylan", actorType: "human" },
          targetType: "content",
          targetId: "c_1",
          payload: { body: "Yanıt metni" },
          createdAt: new Date().toISOString(),
          readAt: null,
        },
        {
          id: "n_foll_1",
          kind: "new_follower",
          actor: { id: "2", username: "dila", actorType: "ai_agent" },
          targetType: "actor",
          targetId: "usr_1",
          payload: {},
          createdAt: new Date().toISOString(),
          readAt: null,
        },
      ];

      global.fetch = vi.fn().mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              notifications: [mockItems[0]],
              nextCursor: null,
              unreadCount: 2,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      );

      render(
        <InboxView
          initialNotifications={mockItems}
          initialNextCursor={null}
          initialUnreadCount={2}
        />,
      );

      // Başlangıçta 2 öğe var
      expect(screen.getAllByTestId("notification-card").length).toBe(2);

      // Yanıtlar sekmesini tıkla
      const repliesTab = screen.getByTestId("tab-replies");
      await act(async () => {
        fireEvent.click(repliesTab);
      });
      expect(global.fetch).toHaveBeenCalled();

      // Yalnızca API'den dönen yanıt bildirimi görünür kalmalı.
      await waitFor(() => {
        expect(screen.getAllByTestId("notification-card")).toHaveLength(1);
        expect(screen.getByTestId("notification-card").getAttribute("data-notification-id")).toBe(
          "n_rep_1",
        );
      });
    });

    it("Takipçiler filtresi yalnızca takip bildirimlerini gösterir ve satırları günlere göre gruplar", async () => {
      const items: NotificationRow[] = [
        {
          id: "n_day_1",
          kind: "new_follower",
          actor: { id: "usr_1", username: "first", actorType: "human" },
          targetType: "actor",
          targetId: "usr_me",
          payload: {},
          createdAt: "2026-09-17T12:00:00Z",
          readAt: null,
        },
        {
          id: "n_day_2",
          kind: "new_follower",
          actor: { id: "usr_2", username: "second", actorType: "human" },
          targetType: "actor",
          targetId: "usr_me",
          payload: {},
          createdAt: "2026-09-17T10:00:00Z",
          readAt: null,
        },
        {
          id: "n_day_3",
          kind: "comment_on_post",
          actor: { id: "usr_3", username: "third", actorType: "human" },
          targetType: "content",
          targetId: "c_1",
          payload: {},
          createdAt: "2026-09-16T12:00:00Z",
          readAt: null,
        },
      ];
      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            notifications: items.slice(0, 2),
            nextCursor: null,
            unreadCount: 2,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

      render(
        <InboxView initialNotifications={items} initialNextCursor={null} initialUnreadCount={2} />,
      );

      expect(screen.getByTestId("tab-follows")).toBeDefined();
      const groups = screen.getAllByTestId("notification-day-group");
      expect(groups).toHaveLength(2);
      expect(groups[0]?.getAttribute("data-day")).toBe("2026-09-17");
      expect(groups[0]?.querySelectorAll('[data-testid="notification-card"]').length).toBe(2);
      expect(groups[1]?.getAttribute("data-day")).toBe("2026-09-16");

      await act(async () => {
        fireEvent.click(screen.getByTestId("tab-follows"));
      });

      await waitFor(() => {
        const rows = screen.getAllByTestId("notification-card");
        expect(rows).toHaveLength(2);
        expect(rows.every((row) => row.getAttribute("data-notification-id") !== "n_day_3")).toBe(
          true,
        );
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("filter=follows"),
        expect.any(Object),
      );
    });
  });
});
