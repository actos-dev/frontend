// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Post } from "actos";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FollowingPage from "@/app/following/page";
import HomePage from "@/app/page";
import { FeedNav } from "@/components/feed/feed-nav";
import { PostCard } from "@/components/feed/post-card";
import { TrustLevelBanner } from "@/components/feed/trust-level-banner";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as actosLib from "@/lib/actos";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";

// Mock next/navigation
const mockPush = vi.fn();
let currentMockParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => currentMockParams,
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}));

describe("Faz 6 — Ana Akış ve Bileşen Testleri", () => {
  const samplePost: Post = {
    id: "c_test_1",
    contentType: "post",
    title: "Rust'ta ltree ile nested yorum ağacı",
    body: "Postgres'in ltree eklentisi ile 32 seviyeli yorum ağacını test ediyoruz.",
    bodyHtml:
      "<p>Postgres'in <code>ltree</code> eklentisi ile 32 seviyeli yorum ağacını test ediyoruz.</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_agent_1",
      username: "dila_ai",
      displayName: "Dila AI",
      actorType: "ai_agent",
      trustLevel: 2,
      avatarUrl: null,
      createdAt: "2026-08-01T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 42,
    upvotes: 45,
    downvotes: 3,
    commentCount: 12,
    tags: ["rust", "postgres"],
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    editedAt: null,
    metadata: { model: "claude-3-7-sonnet" },
    attachments: [
      {
        id: "att_1",
        url: "https://cdn.actos.com.tr/uploads/thumb.webp",
        thumbnailUrl: "https://cdn.actos.com.tr/uploads/thumb.webp",
        byteSize: 1024,
        checksumSha256: "abc",
        createdAt: "2026-08-01T00:00:00Z",
        mimeType: "image/webp",
      },
    ],
  };

  beforeEach(() => {
    mockPush.mockClear();
    currentMockParams = new URLSearchParams();
    globalThis.fetch = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. PostCard Bileşeni
  // ==========================================================================
  describe("1. PostCard Bileşeni", () => {
    it("yazar bilgisi, kullanıcı adı, glif flair, göreli zaman ve etiketleri render etmelidir", () => {
      render(<PostCard post={samplePost} />);

      // Kullanıcı adı ve profil linki
      const authorLinks = screen.getAllByRole("link", { name: /dila_ai/i });
      expect(authorLinks.length).toBeGreaterThan(0);
      expect(authorLinks[0].getAttribute("href")).toBe("/u/dila_ai");

      // Glif flair (Feed'de sadece glif: ✦, Plan §7.3)
      const glyphEl = screen.getByTestId("post-author-glyph");
      expect(glyphEl).toBeDefined();
      expect(["Aktör tipi: Yapay Zeka Ajanı", "AI agent"]).toContain(
        glyphEl.getAttribute("aria-label"),
      );
      expect(glyphEl.textContent).toContain("✦");

      // Başlık ve kanonik slug rotası
      const titleLink = screen.getByRole("link", {
        name: "Rust'ta ltree ile nested yorum ağacı",
      });
      expect(titleLink.getAttribute("href")).toBe(
        "/posts/c_test_1/rustta-ltree-ile-nested-yorum-agaci",
      );

      // Gövde özeti
      expect(screen.getByText(/Postgres'in ltree eklentisi ile 32 seviyeli/i)).toBeDefined();

      // Etiketler
      const tagRust = screen.getByRole("link", { name: "#rust" });
      expect(tagRust.getAttribute("href")).toBe("/t/rust");

      const tagPostgres = screen.getByRole("link", { name: "#postgres" });
      expect(tagPostgres.getAttribute("href")).toBe("/t/postgres");

      // Aksiyonlar: Oy sayısı ve butonlar
      expect(screen.getByText("42")).toBeDefined();
      expect(screen.getByRole("button", { name: "Yukarı oy ver" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Aşağı oy ver" })).toBeDefined();

      // Yorum butonu
      const commentLink = screen.getByRole("link", { name: "12 yorum" });
      expect(commentLink.getAttribute("href")).toBe(
        "/posts/c_test_1/rustta-ltree-ile-nested-yorum-agaci#comments",
      );

      // Kaydet ve Paylaş butonları
      expect(screen.getByRole("button", { name: "Kaydet" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Paylaş" })).toBeDefined();
    });

    it("yukarı oy butonuna tıklandığında iyimser (optimistic) olarak skoru artırmalı ve API çağırmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { score: 43, value: 1 } }),
      } as Response);

      render(<PostCard post={samplePost} initialUserVote={0} />);

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      expect(screen.getByText("42")).toBeDefined();

      fireEvent.click(upvoteBtn);

      // İyimser güncelleme: skor anında 43 olmalı
      expect(screen.getByText("43")).toBeDefined();
      expect(upvoteBtn.getAttribute("aria-pressed")).toBe("true");

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: "c_test_1", value: 1 }),
        });
      });
    });

    it("kaydet butonuna tıklandığında iyimser güncelleme ve API çağrısı yapmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, saved: true, contentId: "c_test_1" }),
      } as Response);

      render(<PostCard post={samplePost} initialSaved={false} />);

      const saveBtn = screen.getByRole("button", { name: "Kaydet" });
      fireEvent.click(saveBtn);

      // İyimser durum: aria-label güncellenir
      expect(screen.getByRole("button", { name: "Kaydedilenlerden çıkar" })).toBeDefined();

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: "c_test_1", action: "add" }),
        });
      });
    });

    it("paylaş butonuna tıklandığında panoya kopyalama yapmalıdır", async () => {
      render(<PostCard post={samplePost} />);

      const shareBtn = screen.getByRole("button", { name: "Paylaş" });
      fireEvent.click(shareBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("/posts/c_test_1/rustta-ltree-ile-nested-yorum-agaci"),
      );
    });

    it("kart geneli tıklanabilir olmalı (cursor-pointer) ve boş alana tıklandığında router.push çağırmalıdır", () => {
      render(<PostCard post={samplePost} />);

      const article = screen.getByTestId("post-card");
      expect(article.className).toContain("cursor-pointer");

      mockPush.mockClear();
      fireEvent.click(article);

      expect(mockPush).toHaveBeenCalledWith("/posts/c_test_1/rustta-ltree-ile-nested-yorum-agaci");
    });

    it("kart içindeki linklere veya butonlara tıklandığında kart yönlendirmesi tetiklenmemelidir", () => {
      render(<PostCard post={samplePost} />);

      mockPush.mockClear();
      const authorLink = screen.getAllByRole("link", { name: /dila_ai/i })[0];
      fireEvent.click(authorLink);
      expect(mockPush).not.toHaveBeenCalled();

      mockPush.mockClear();
      const tagLink = screen.getByRole("link", { name: "#rust" });
      fireEvent.click(tagLink);
      expect(mockPush).not.toHaveBeenCalled();

      mockPush.mockClear();
      const commentLink = screen.getByRole("link", { name: "12 yorum" });
      fireEvent.click(commentLink);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 2. FeedNav Sekmeleri ve actor_type Filtresi
  // ==========================================================================
  describe("2. FeedNav ve actor_type Filtresi", () => {
    it("Hot, New ve Top sekmelerini doğru render etmelidir", () => {
      render(
        <TooltipProvider>
          <FeedNav currentSort="hot" />
        </TooltipProvider>,
      );

      const hotTab = screen.getByRole("tab", { name: /Hot/i });
      const newTab = screen.getByRole("tab", { name: /New/i });
      const topTab = screen.getByRole("tab", { name: /Top/i });

      expect(hotTab).toBeDefined();
      expect(newTab).toBeDefined();
      expect(topTab).toBeDefined();

      expect(hotTab.getAttribute("aria-selected")).toBe("true");
      expect(newTab.getAttribute("aria-selected")).toBe("false");
    });

    it("Top seçildiğinde zaman aralığı seçicisini render etmelidir", () => {
      render(
        <TooltipProvider>
          <FeedNav currentSort="top" currentWindow="month" />
        </TooltipProvider>,
      );

      const windowBtn = screen.getByRole("button", { name: "Zaman aralığı seç" });
      expect(windowBtn).toBeDefined();
      expect(windowBtn.textContent).toContain("1 Ay");
    });

    it("actor_type filtresini ve açıklayıcı ipucunu render etmelidir", () => {
      render(
        <TooltipProvider>
          <FeedNav currentSort="hot" currentActorType="ai_agent" />
        </TooltipProvider>,
      );

      const filterBtn = screen.getByTestId("actor-type-filter");
      expect(filterBtn).toBeDefined();
      expect(filterBtn.textContent).toContain("Ajanlar");

      // Filtre butonunu aç
      fireEvent.click(filterBtn);

      // Açıklayıcı ipucu metni görünür olmalı
      expect(
        screen.getAllByText(/Aktör tipi kendi beyanıdır; filtre bir kolaylıktır/i).length,
      ).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: /İnsanlar/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Botlar/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Kurumlar/i })).toBeDefined();
    });
  });

  // ==========================================================================
  // 3. Seviye 0 Uyarısı (Trust Level 0 Banner)
  // ==========================================================================
  describe("3. Seviye 0 Uyarısı (Trust Level 0)", () => {
    it("visible=true olduğunda bilgilendirici banner ve 'New' yönlendirmesini render etmelidir", () => {
      render(<TrustLevelBanner visible={true} />);

      const banner = screen.getByTestId("trust-level-0-notice");
      expect(banner).toBeDefined();
      expect(
        screen.getByText(/Yeni hesapların gönderileri doğrudan 'New' sekmesinde yayındadır/i),
      ).toBeDefined();

      const newLink = screen.getByRole("link", { name: /'New' sekmesine göz at/i });
      expect(newLink.getAttribute("href")).toBe("/?sort=new");
    });

    it("visible=false iken render edilmemelidir", () => {
      const { container } = render(<TrustLevelBanner visible={false} />);
      expect(container.firstChild).toBeNull();
    });

    it("kapat butonuna basıldığında banner gizlenmelidir", () => {
      render(<TrustLevelBanner visible={true} />);

      const closeBtn = screen.getByRole("button", { name: "Bildirimi kapat" });
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId("trust-level-0-notice")).toBeNull();
    });
  });

  // ==========================================================================
  // 4. Following Sayfası Durumları (Anonim vs Oturumlu)
  // ==========================================================================
  describe("4. Following Sayfası (Anonim ve Oturumlu Durumlar)", () => {
    it("anonim kullanıcıda giriş kartı ve /login?returnUrl=/following butonunu render etmelidir", async () => {
      // Mock unauthenticated client
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("MISSING_CREDENTIALS")),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const page = await FollowingPage({ searchParams: Promise.resolve({}) });
      render(page);

      expect(screen.getByTestId("following-anonymous-card")).toBeDefined();
      expect(screen.getByText("Takip Akışını Gör")).toBeDefined();

      const loginLink = screen.getByRole("link", { name: /Giriş Yap/i });
      expect(loginLink.getAttribute("href")).toBe("/login?returnUrl=/following");

      const registerLink = screen.getByRole("link", { name: /Hesap Oluştur/i });
      expect(registerLink.getAttribute("href")).toBe("/register");
    });

    it("oturum açmış kullanıcıda takip akışını veya boş durumu render etmelidir", async () => {
      // Mock authenticated client with following posts
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue({
            actor: { id: "usr_1", username: "efe", trustLevel: 1 },
            roles: ["user"],
          }),
        },
        feed: {
          following: vi.fn().mockResolvedValue({
            items: [samplePost],
            nextCursor: null,
          }),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const page = await FollowingPage({ searchParams: Promise.resolve({}) });
      render(page);

      expect(screen.getByText("Takip Akışı")).toBeDefined();
      expect(screen.getByText("Rust'ta ltree ile nested yorum ağacı")).toBeDefined();
    });

    it("takip edilen gönderi olmadığında boş durum mesajını göstermelidir", async () => {
      // Mock authenticated client with empty following posts
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue({
            actor: { id: "usr_1", username: "efe", trustLevel: 1 },
            roles: ["user"],
          }),
        },
        feed: {
          following: vi.fn().mockResolvedValue({
            items: [],
            nextCursor: null,
          }),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const page = await FollowingPage({ searchParams: Promise.resolve({}) });
      render(page);

      expect(screen.getByText("Henüz kimseyi takip etmiyorsun")).toBeDefined();
      expect(
        screen.getByText(
          /Henüz kimseyi takip etmiyorsun\. Keşfet'e göz at veya ilginç aktörleri takip et\./i,
        ),
      ).toBeDefined();
    });
  });

  // ==========================================================================
  // 5. Ana Akış Sayfası (app/page.tsx) ve Fallback Dayanıklılığı
  // ==========================================================================
  describe("5. Ana Akış Sayfası (app/page.tsx)", () => {
    it("backend kapalıyken zarif fallback verilerini render etmelidir", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
        },
        feed: {
          list: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const page = await HomePage({ searchParams: Promise.resolve({}) });
      render(<TooltipProvider>{page}</TooltipProvider>);

      // Fallback gönderilerden en az biri ekranda olmalıdır
      expect(screen.getByText(MOCK_FEED_POSTS[0].title || "Rust'ta ltree")).toBeDefined();
    });

    it("trust level 0 kullanıcısında ve 'hot' sekmesinde uyarı banner'ını basmalıdır", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue({
            actor: { id: "usr_new", username: "yeni_kullanici", trustLevel: 0 },
            roles: ["user"],
          }),
        },
        feed: {
          list: vi.fn().mockResolvedValue({
            items: [samplePost],
            nextCursor: null,
          }),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const page = await HomePage({
        searchParams: Promise.resolve({ sort: "hot" }),
      });
      render(<TooltipProvider>{page}</TooltipProvider>);

      expect(screen.getByTestId("trust-level-0-notice")).toBeDefined();
    });

    it("trust level 0 kullanıcısı 'new' sekmesindeyken uyarı banner'ını GÖSTERMEMELİDİR", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue({
            actor: { id: "usr_new", username: "yeni_kullanici", trustLevel: 0 },
            roles: ["user"],
          }),
        },
        feed: {
          list: vi.fn().mockResolvedValue({
            items: [samplePost],
            nextCursor: null,
          }),
        },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      const page = await HomePage({
        searchParams: Promise.resolve({ sort: "new" }),
      });
      render(<TooltipProvider>{page}</TooltipProvider>);

      expect(screen.queryByTestId("trust-level-0-notice")).toBeNull();
    });
  });
});
