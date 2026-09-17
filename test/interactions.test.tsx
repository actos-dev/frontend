// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import type { Post } from "actos";
import { NextRequest } from "next/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as savedRoute from "@/app/api/saved/route";
import SavedPage from "@/app/saved/page";
import { FollowButton } from "@/components/actor/follow-button";
import { PostCard } from "@/components/feed/post-card";
import { PostActions } from "@/components/post/post-actions";
import { REPORT_REASONS, ReportDialog } from "@/components/post/report-dialog";
import { SavedStream } from "@/components/saved/saved-stream";
import { toast } from "@/components/ui/toast";
import * as actosLib from "@/lib/actos";
import { queryKeys } from "@/lib/query/keys";
import { normalizeFeedFilters } from "@/lib/query/queries";
import { useSessionStore } from "@/lib/stores/session-store";

function render(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = rtlRender(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return {
    ...result,
    queryClient,
    rerender: (nextUi: ReactNode) =>
      result.rerender(<QueryClientProvider client={queryClient}>{nextUi}</QueryClientProvider>),
  };
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
  usePathname: () => "/posts/c_post_1/test-post",
  useSearchParams: () => currentMockParams,
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}));

// Mock toast notifications
vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Faz 9 — Etkileşimler Test Paketi", () => {
  const sampleOtherPost: Post = {
    id: "c_post_other",
    contentType: "post",
    title: "Diğer Yazarın Gönderisi",
    body: "Bu gönderi başka bir kullanıcı tarafından yazıldı.",
    bodyHtml: "<p>Bu gönderi başka bir kullanıcı tarafından yazıldı.</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_alice",
      username: "alice",
      displayName: "Alice",
      actorType: "human",
      createdAt: "2026-08-01T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 10,
    upvotes: 12,
    downvotes: 2,
    commentCount: 4,
    tags: ["tech"],
    createdAt: "2026-09-04T10:00:00Z",
    editedAt: null,
  };

  const sampleOwnPost: Post = {
    id: "c_post_own",
    contentType: "post",
    title: "Kendi Gönderim",
    body: "Bu benim kendi yazdığım içerik.",
    bodyHtml: "<p>Bu benim kendi yazdığım içerik.</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_me",
      username: "efe",
      displayName: "Efe",
      actorType: "human",
      createdAt: "2026-08-01T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 5,
    upvotes: 5,
    downvotes: 0,
    commentCount: 1,
    tags: ["personal"],
    createdAt: "2026-09-04T11:00:00Z",
    editedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = "actos_locale=tr; path=/";
    currentMockParams = new URLSearchParams();
    globalThis.fetch = vi.fn();
    useSessionStore.setState({
      user: {
        id: "usr_me",
        username: "efe",
        displayName: "Efe",
        actorType: "human",
        role: "user",
      },
      status: "authenticated",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. Oy Sistemi: İyimser Güncelleme ve Hatada Rollback
  // ==========================================================================
  describe("1. Oy Sistemi (Voting)", () => {
    it("yukarı oy butonuna tıklandığında anında iyimser olarak skoru artırmalı ve API çağırmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { score: 11, value: 1 } }),
      } as Response);

      render(<PostCard post={sampleOtherPost} initialUserVote={0} />);

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      expect(screen.getByText("10")).toBeDefined();

      fireEvent.click(upvoteBtn);

      // İyimser güncelleme: skor anında 11 olmalı
      await waitFor(() => {
        expect(screen.getByText("11")).toBeDefined();
        expect(upvoteBtn.getAttribute("aria-pressed")).toBe("true");
      });

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/vote", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: "c_post_other", value: 1 }),
        });
      });
    });

    it("aşağı oy butonuna tıklandığında anında iyimser olarak skoru azaltmalı ve API çağırmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { score: 9, value: -1 } }),
      } as Response);

      render(<PostCard post={sampleOtherPost} initialUserVote={0} />);

      const downvoteBtn = screen.getByRole("button", { name: "Aşağı oy ver" });
      fireEvent.click(downvoteBtn);

      // İyimser güncelleme: skor anında 9 olmalı
      await waitFor(() => {
        expect(screen.getByText("9")).toBeDefined();
        expect(downvoteBtn.getAttribute("aria-pressed")).toBe("true");
      });

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/vote", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: "c_post_other", value: -1 }),
        });
      });
    });

    it("verilen oya tekrar basıldığında oyu geri çekmeli (0) ve skoru dengelemelidir", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: { score: 10, value: 0 } }),
      } as Response);

      // Kullanıcı önceden yukarı oy vermiş (initialUserVote=1, score=11)
      render(<PostCard post={{ ...sampleOtherPost, score: 11 }} initialUserVote={1} />);

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      expect(screen.getByText("11")).toBeDefined();

      fireEvent.click(upvoteBtn);

      // Geri çekme: skor 11'den 10'a inmeli
      await waitFor(() => {
        expect(screen.getByText("10")).toBeDefined();
        expect(upvoteBtn.getAttribute("aria-pressed")).toBe("false");
      });

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/vote", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: "c_post_other", value: 0 }),
        });
      });
    });

    it("sunucu hatasında (500) iyimser oy durumunu ve skoru geri almalı (rollback) ve hata tostu göstermelidir", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          ok: false,
          code: "INTERNAL",
          detail: "Veritabanı bağlantı hatası",
        }),
      } as Response);

      render(<PostCard post={sampleOtherPost} initialUserVote={0} />);

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      fireEvent.click(upvoteBtn);

      // Hata sonrasında eski haline (10) dönmeli
      await waitFor(() => {
        expect(screen.getByText("10")).toBeDefined();
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("geç başarısız bir oyun rollback'i başka gönderideki daha yeni başarılı oyu geri almamalıdır", async () => {
      let finishFailedVote: (response: Response) => void = () => {};
      const failedRequest = new Promise<Response>((resolve) => {
        finishFailedVote = resolve;
      });
      vi.mocked(globalThis.fetch).mockImplementation((_input, init) => {
        const payload = JSON.parse(String(init?.body)) as { contentId: string };
        if (payload.contentId === sampleOtherPost.id) return failedRequest;
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true, data: { score: 21, value: 1 } }),
        } as Response);
      });

      const secondPost = {
        ...sampleOtherPost,
        id: "c_post_second",
        title: "İkinci gönderi",
        score: 20,
      };
      const { queryClient } = render(
        <>
          <PostCard post={sampleOtherPost} initialUserVote={0} />
          <PostCard post={secondPost} initialUserVote={0} />
        </>,
      );
      const feedKey = queryKeys.feeds.list(
        normalizeFeedFilters({ sort: "hot" }),
        "authenticated",
        "usr_me",
      );
      queryClient.setQueryData(feedKey, {
        pages: [{ items: [sampleOtherPost, secondPost], nextCursor: null, votes: {} }],
        pageParams: [null],
      });

      const upvoteButtons = screen.getAllByRole("button", { name: "Yukarı oy ver" });
      fireEvent.click(upvoteButtons[0]);
      fireEvent.click(upvoteButtons[1]);

      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
      await waitFor(() => {
        const cache = queryClient.getQueryData<{ pages: Array<{ items: Post[] }> }>(feedKey);
        expect(cache?.pages[0]?.items.find((item) => item.id === secondPost.id)?.score).toBe(21);
      });

      finishFailedVote({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, detail: "İlk oy başarısız oldu" }),
      } as Response);

      await waitFor(() => {
        const cache = queryClient.getQueryData<{ pages: Array<{ items: Post[] }> }>(feedKey);
        expect(cache?.pages[0]?.items.find((item) => item.id === sampleOtherPost.id)?.score).toBe(
          10,
        );
        expect(cache?.pages[0]?.items.find((item) => item.id === secondPost.id)?.score).toBe(21);
      });
    });

    it("önceki interaction snapshot'ı yoksa başarısız oy optimistic query'sini kaldırmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, detail: "Oy kaydedilemedi" }),
      } as Response);

      const { queryClient } = render(<PostCard post={sampleOtherPost} initialUserVote={0} />);
      const interactionKey = queryKeys.interactions.content(sampleOtherPost.id, "usr_me");
      queryClient.removeQueries({ queryKey: interactionKey, exact: true });

      fireEvent.click(screen.getByRole("button", { name: "Yukarı oy ver" }));

      await waitFor(() => {
        expect(screen.getByText("10")).toBeDefined();
        expect(queryClient.getQueryCache().find({ queryKey: interactionKey, exact: true })).toBe(
          undefined,
        );
      });
    });

    it("giriş yapmamış anonim kullanıcı oy butonuna bastığında /login sayfasına yönlendirilmelidir", async () => {
      useSessionStore.setState({
        user: null,
        status: "unauthenticated",
      });

      render(<PostCard post={sampleOtherPost} initialUserVote={0} />);

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      fireEvent.click(upvoteBtn);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/login?returnUrl="));
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 2. Kendi İçeriğine Oy Verilemediği Kısıtlaması (Plan §Faz 9)
  // ==========================================================================
  describe("2. Kendi İçeriğine Oy Verilemediği Kısıtlaması", () => {
    it("kullanıcı kendi içeriğindeyken oy butonları devre dışı bırakılmalı ve açıklayıcı ipucu taşımalıdır", () => {
      // sampleOwnPost yazarı 'efe', oturum açmış kullanıcı da 'efe'
      render(<PostCard post={sampleOwnPost} />);

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      const downvoteBtn = screen.getByRole("button", { name: "Aşağı oy ver" });

      expect(upvoteBtn.hasAttribute("disabled")).toBe(true);
      expect(downvoteBtn.hasAttribute("disabled")).toBe(true);

      expect(upvoteBtn.getAttribute("title")).toBe("Kendi içeriğinize oy veremezsiniz");
      expect(downvoteBtn.getAttribute("title")).toBe("Kendi içeriğinize oy veremezsiniz");
    });

    it("PostActions detay sayfasında kendi içeriğinde oy butonları devre dışı olmalıdır", () => {
      render(<PostActions post={sampleOwnPost} isAuthor={true} />);

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      const downvoteBtn = screen.getByRole("button", { name: "Aşağı oy ver" });

      expect(upvoteBtn.hasAttribute("disabled")).toBe(true);
      expect(downvoteBtn.hasAttribute("disabled")).toBe(true);
      expect(upvoteBtn.getAttribute("title")).toBe("Kendi içeriğinize oy veremezsiniz");
    });

    it("kendi içeriğindeyken oy butonları devre dışı olmalı, tıklama engellenmeli ve API çağrısı yapılmamalıdır", () => {
      render(<PostCard post={sampleOwnPost} />);

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      expect(upvoteBtn.hasAttribute("disabled")).toBe(true);
      expect(upvoteBtn.getAttribute("title")).toBe("Kendi içeriğinize oy veremezsiniz");

      fireEvent.click(upvoteBtn);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("backend 403 FORBIDDEN döndüğünde iyimser oy geri alınmalı (rollback) ve hata tostu gösterilmelidir", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          ok: false,
          code: "FORBIDDEN",
          detail: "Kendi içeriğinize oy veremezsiniz.",
        }),
      } as Response);

      render(<PostCard post={sampleOtherPost} initialUserVote={0} />);

      const upvoteBtn = screen.getByRole("button", { name: "Yukarı oy ver" });
      fireEvent.click(upvoteBtn);

      await waitFor(() => {
        expect(screen.getByText("10")).toBeDefined();
        expect(toast.error).toHaveBeenCalledWith("Kendi içeriğinize oy veremezsiniz.");
      });
    });
  });

  // ==========================================================================
  // 3. Kaydet / Kaydı Kaldır ve /saved Sayfası
  // ==========================================================================
  describe("3. Kaydet / Kaydı Kaldır ve /saved Sayfası", () => {
    it("kaydet butonuna basıldığında anında iyimser olarak kaydedildi durumuna geçmeli ve API çağırmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, saved: true, contentId: "c_post_other" }),
      } as Response);

      render(<PostCard post={sampleOtherPost} initialSaved={false} />);

      const saveBtn = screen.getByRole("button", { name: "Kaydet" });
      fireEvent.click(saveBtn);

      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Kaydedilenlerden çıkar" })).toBeDefined(),
      );

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/save", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: "c_post_other", action: "add" }),
        });
        expect(toast.success).toHaveBeenCalledWith("Post kaydedildi!");
      });
    });

    it("kayıtlı bir gönderide kaydı kaldıra basıldığında iyimser olarak güncellenmeli ve action: remove göndermelidir", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, saved: false, contentId: "c_post_other" }),
      } as Response);

      render(<PostCard post={sampleOtherPost} initialSaved={true} />);

      const unsaveBtn = screen.getByRole("button", { name: "Kaydedilenlerden çıkar" });
      fireEvent.click(unsaveBtn);

      await waitFor(() => expect(screen.getByRole("button", { name: "Kaydet" })).toBeDefined());

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/save", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: "c_post_other", action: "remove" }),
        });
        expect(toast.success).toHaveBeenCalledWith("Kayıt kaldırıldı.");
      });
    });

    it("kaydetme isteği başarısız olursa önceki duruma geri dönmeli ve hata tostu vermelidir", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, detail: "Kayıt veritabanına yazılamadı" }),
      } as Response);

      render(<PostCard post={sampleOtherPost} initialSaved={false} />);

      const saveBtn = screen.getByRole("button", { name: "Kaydet" });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Kaydet" })).toBeDefined();
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("önceki interaction snapshot'ı yoksa başarısız kaydetme optimistic query'sini kaldırmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, detail: "Kayıt eklenemedi" }),
      } as Response);

      const { queryClient } = render(<PostCard post={sampleOtherPost} initialSaved={false} />);
      const interactionKey = queryKeys.interactions.content(sampleOtherPost.id, "usr_me");
      queryClient.removeQueries({ queryKey: interactionKey, exact: true });

      fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Kaydet" })).toBeDefined();
        expect(queryClient.getQueryCache().find({ queryKey: interactionKey, exact: true })).toBe(
          undefined,
        );
      });
    });

    it("/saved sayfası anonim kullanıcıya açık oturum açma kartı ve /login?returnUrl=/saved bağlantısı sunmalıdır", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("Unauthorized")),
        },
      } as unknown as actosLib.Actos);

      const pageJSX = await SavedPage({});
      render(pageJSX);

      expect(screen.getByTestId("saved-anonymous-card")).toBeDefined();
      const loginLink = screen.getByRole("link", { name: /Giriş Yap/i });
      expect(loginLink.getAttribute("href")).toBe("/login?returnUrl=/saved");
    });

    it("/saved sayfası oturumlu kullanıcı için kayıtlı postları listelemelidir", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue({ actor: { id: "usr_me" } }),
        },
        saves: {
          list: vi.fn().mockResolvedValue({
            items: [sampleOtherPost],
            nextCursor: null,
          }),
        },
      } as unknown as actosLib.Actos);

      const pageJSX = await SavedPage({});
      render(pageJSX);

      expect(screen.getByText("Diğer Yazarın Gönderisi")).toBeDefined();
    });

    it("/saved sayfasında kayıtlı gönderi yoksa EmptyState ve Akışa Dön butonunu göstermelidir", () => {
      render(<SavedStream initialPosts={[]} initialNextCursor={null} />);

      expect(screen.getByTestId("saved-empty-state")).toBeDefined();
      expect(screen.getByText("Henüz kaydedilmiş bir gönderi yok")).toBeDefined();
      expect(screen.getByRole("link", { name: /Akışa Dön/i })).toBeDefined();
    });

    it("/saved sayfası backend hata verdiğinde boş durum yerine hata ekranı render etmelidir (ROADMAP.md P0-02)", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        auth: {
          whoami: vi.fn().mockResolvedValue({ actor: { id: "usr_me" } }),
        },
        saves: {
          list: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
        },
      } as unknown as actosLib.Actos);

      const pageJSX = await SavedPage({});
      render(pageJSX);

      // A failed fetch is not the same thing as "you saved nothing".
      expect(screen.queryByTestId("saved-empty-state")).toBeNull();
      expect(screen.getByRole("alert")).toBeDefined();
    });

    it("GET /api/saved returns a mapped error instead of a fake empty page when the backend call fails (ROADMAP.md P0-02)", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        saves: {
          list: vi.fn().mockRejectedValue({ status: 503, code: "NETWORK_ERROR" }),
        },
      } as unknown as actosLib.Actos);

      const req = new NextRequest("http://localhost:3000/api/saved");
      const res = await savedRoute.GET(req);

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.code).toBe("NETWORK_ERROR");
      expect(body.items).toBeUndefined();
    });
  });

  // ==========================================================================
  // 4. Takip / Takibi Bırak Etkileşimi (FollowButton)
  // ==========================================================================
  describe("4. Takip / Takibi Bırak (FollowButton)", () => {
    it("takip et butonuna basıldığında iyimser olarak Takip Ediliyor'a dönmeli ve API çağırmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, following: true, username: "alice" }),
      } as Response);

      const onFollowChange = vi.fn();
      render(
        <FollowButton username="alice" initialFollowing={false} onFollowChange={onFollowChange} />,
      );

      const btn = screen.getByTestId("follow-button");
      expect(screen.getByText(/takip et/i)).toBeDefined();

      fireEvent.click(btn);

      // İyimser güncelleme
      await waitFor(() => expect(screen.getByText(/takip ediliyor/i)).toBeDefined());

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/follow", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "alice", action: "follow" }),
        });
        expect(onFollowChange).toHaveBeenCalledWith(true);
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("takip edildi"));
      });
    });

    it("takip ediliyorken tıklandığında iyimser olarak Takip Et'e dönmeli ve action: unfollow göndermelidir", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, following: false, username: "alice" }),
      } as Response);

      render(<FollowButton username="alice" initialFollowing={true} />);

      const btn = screen.getByTestId("follow-button");
      expect(screen.getByText(/takip ediliyor/i)).toBeDefined();

      fireEvent.click(btn);

      await waitFor(() => expect(screen.getByText(/takip et/i)).toBeDefined());

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/follow", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "alice", action: "unfollow" }),
        });
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("takipten çıkarıldı"));
      });
    });

    it("takip isteği başarısız olursa eski durumuna geri dönmeli ve hata tostu basmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, detail: "Sunucu hatası" }),
      } as Response);

      render(<FollowButton username="alice" initialFollowing={false} />);

      const btn = screen.getByTestId("follow-button");
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByText(/takip et/i)).toBeDefined();
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("kullanıcı kendi profilinde ise buton gizlenmeli (null dönmeli) veya showSelf ile devre dışı olmalıdır", () => {
      // currentUser = efe, username = efe
      const { container, rerender } = render(<FollowButton username="efe" />);
      expect(container.firstChild).toBeNull();

      rerender(<FollowButton username="efe" showSelf={true} />);
      const selfBtn = screen.getByTestId("follow-button-self");
      expect(selfBtn.hasAttribute("disabled")).toBe(true);
      expect(selfBtn.getAttribute("title")).toMatch(
        /(Kendi profilinizi takip edemezsiniz|You cannot follow your own profile)/,
      );
    });

    it("anonim kullanıcı takip butonuna bastığında /login sayfasına yönlendirilmelidir", () => {
      useSessionStore.setState({
        user: null,
        status: "unauthenticated",
      });

      render(<FollowButton username="alice" />);
      const btn = screen.getByTestId("follow-button");
      fireEvent.click(btn);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/login?returnUrl="));
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 5. Rapor Etme Akışı (ReportDialog)
  // ==========================================================================
  describe("5. Rapor Etme Akışı (ReportDialog)", () => {
    it("diyalog açıldığında tüm standart rapor seçeneklerini sunmalıdır", () => {
      render(
        <ReportDialog
          open={true}
          onOpenChange={vi.fn()}
          targetId="c_post_other"
          targetType="content"
        />,
      );

      expect(screen.getByTestId("report-dialog")).toBeDefined();
      expect(screen.getByText("İçeriği Şikayet Et")).toBeDefined();

      // Standart 6 seçenek: Spam, Taciz / Zorbalık, Yanıltıcı Bilgi, Zararlı İçerik, Kurallara Aykırı, Diğer
      for (const reason of REPORT_REASONS) {
        expect(screen.getByText(reason)).toBeDefined();
      }
    });

    it("farklı bir rapor sebebi ve açıklama seçilip gönderildiğinde API'yi çağırmalı ve teşekkür tostu basmalıdır", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ ok: true, report: { id: "rep_123" } }),
      } as Response);

      const onOpenChange = vi.fn();
      render(
        <ReportDialog
          open={true}
          onOpenChange={onOpenChange}
          targetId="c_post_other"
          targetType="content"
        />,
      );

      // Yanıltıcı Bilgi seçeneğine tıkla
      const radio = screen.getByTestId("report-reason-Yanıltıcı Bilgi");
      fireEvent.click(radio);

      // Açıklama yaz
      const textarea = screen.getByTestId("report-details-textarea");
      fireEvent.change(textarea, {
        target: { value: "Bu içerik sahte iddialar içeriyor." },
      });

      // Gönder butonuna tıkla
      const submitBtn = screen.getByTestId("report-submit-button");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/actions/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: "content",
            targetId: "c_post_other",
            reason: "Yanıltıcı Bilgi: Bu içerik sahte iddialar içeriyor.",
          }),
        });

        expect(toast.success).toHaveBeenCalledWith(
          "Şikayetiniz moderasyon ekibine iletildi. Teşekkür ederiz.",
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("PostActions üzerindeki şikayet butonuna basıldığında ReportDialog açılmalıdır", () => {
      render(<PostActions post={sampleOtherPost} />);

      const reportBtn = screen.getByTestId("post-report-button");
      fireEvent.click(reportBtn);

      expect(screen.getByTestId("report-dialog")).toBeDefined();
      expect(screen.getByText("İçeriği Şikayet Et")).toBeDefined();
    });
  });
});
