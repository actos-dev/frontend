// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import type { Post } from "actos";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { FeedNav } from "@/components/feed/feed-nav";
import { PostCard } from "@/components/feed/post-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as actosLib from "@/lib/actos";

function render(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

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

      // Agent label chip (ROADMAP K-08: the ✦ glyph is gone)
      const glyphEl = screen.getByTestId("post-author-glyph");
      expect(glyphEl).toBeDefined();
      expect(glyphEl.getAttribute("aria-label")).toBe("Agent account, self-declared");
      expect(glyphEl.textContent).toBe("Agent");

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
      await waitFor(() => {
        expect(screen.getByText("43")).toBeDefined();
        expect(upvoteBtn.getAttribute("aria-pressed")).toBe("true");
      });

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/vote", {
          method: "POST",
          credentials: "same-origin",
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
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Kaydedilenlerden çıkar" })).toBeDefined(),
      );

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/save", {
          method: "POST",
          credentials: "same-origin",
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

    it("satırın başlık bağlantısı tüm boş alanı erişilebilir bir hedef yapmalıdır", () => {
      render(<PostCard post={samplePost} />);

      const article = screen.getByTestId("post-card");
      expect(article.className).toContain("relative");
      const titleLink = screen.getByTestId("post-title-link");
      expect(titleLink.className).toContain("before:absolute");
      expect(titleLink.getAttribute("href")).toBe(
        "/posts/c_test_1/rustta-ltree-ile-nested-yorum-agaci",
      );
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

      const hotTab = screen.getByRole("link", { name: /Hot/i });
      const newTab = screen.getByRole("link", { name: /New/i });
      const topTab = screen.getByRole("link", { name: /Top/i });

      expect(hotTab).toBeDefined();
      expect(newTab).toBeDefined();
      expect(topTab).toBeDefined();

      expect(hotTab.getAttribute("aria-current")).toBe("page");
      expect(newTab.hasAttribute("aria-current")).toBe(false);
    });

    it("Top seçildiğinde zaman aralığı seçicisini render etmelidir", () => {
      render(
        <TooltipProvider>
          <FeedNav currentSort="top" currentWindow="month" />
        </TooltipProvider>,
      );

      const windowBtn = screen.getByRole("button", { name: "Choose time range" });
      expect(windowBtn).toBeDefined();
      expect(windowBtn.textContent).toContain("1 month");
    });

    it("actor_type filtresini doğrudan ve açıklama gürültüsü olmadan render etmelidir", () => {
      render(
        <TooltipProvider>
          <FeedNav currentSort="hot" currentActorType="ai_agent" />
        </TooltipProvider>,
      );

      expect(screen.getByRole("button", { name: "Agents" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      expect(screen.getByRole("button", { name: "Humans" })).toBeDefined();
      expect(screen.queryByText(/kendi beyanıdır/i)).toBeNull();
    });
  });

  // ==========================================================================
  // 4. Ana Akış Sayfası (app/page.tsx) ve Fallback Dayanıklılığı
  // ==========================================================================
  describe("4. Ana Akış Sayfası (app/page.tsx)", () => {
    it("backend kapalıyken sahte gönderi göstermez, hata ekranı render eder (ROADMAP.md P0-02)", async () => {
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

      // No fabricated posts: an error state with retry instead.
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.queryByText(/Rust'ta ltree/)).toBeNull();
    });

    it("client.feed.list çağrısına asla 'fields' argümanı geçmemelidir (P0-01)", async () => {
      const feedListMock = vi.fn().mockResolvedValue({ items: [samplePost], nextCursor: null });
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        feed: { list: feedListMock },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      await HomePage({ searchParams: Promise.resolve({}) });

      expect(feedListMock).toHaveBeenCalledTimes(1);
      expect(feedListMock.mock.calls[0][0]).not.toHaveProperty("fields");
    });

    it("geçersiz bir window değeri verildiğinde varsayılan 'day' değerine düşmelidir (P0-04)", async () => {
      const feedListMock = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        feed: { list: feedListMock },
      } as unknown as Awaited<ReturnType<typeof actosLib.getServerClient>>);

      await HomePage({
        searchParams: Promise.resolve({ sort: "top", window: "year" }),
      });

      // "year" artık geçerli bir değer değil; sayfa sessizce "day"e düşer ve
      // backend'e asla geçersiz bir window göndermez.
      expect(feedListMock).toHaveBeenCalledWith(expect.objectContaining({ window: "day" }));
    });
  });
});
