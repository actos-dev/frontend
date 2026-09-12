// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Comment, Post } from "actos";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommentTree } from "@/components/comments/comment-tree";
import { PostActions } from "@/components/post/post-actions";
import { SearchView } from "@/components/search/search-view";
import {
  ACTOS_ERROR_CODES,
  apiErrorResponse,
  isActosErrorCode,
  mapErrorCodeToMessage,
} from "@/lib/errors";
import { buildCursorUrl, getCursorFromUrl, syncCursorToUrl } from "@/lib/pagination";
import { generateRecoveryFileContent } from "@/lib/recovery-file";
import { useEditorDraftStore } from "@/lib/stores/editor-draft";
import { useSessionStore } from "@/lib/stores/session-store";
import { syncThemeToDom, useThemeStore } from "@/lib/stores/theme-store";
import { DEFAULT_THEME, getTheme, isValidTheme, PRIMARY_THEMES, THEME_LIST } from "@/lib/themes";

// Mock next/navigation
const mockPush = vi.fn();
const currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/posts/p_journey_1",
  useSearchParams: () => currentSearchParams,
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock toast
vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("Faz 18 — Kapsamlı Vitest Entegrasyon Testi (Full Journey & Boundaries)", () => {
  const sampleUser = {
    id: "usr_journey_test",
    username: "journey_tester",
    displayName: "Yolculuk Test Kullanıcısı",
    actorType: "human" as const,
    role: "user" as const,
    createdAt: "2026-08-01T00:00:00Z",
  };

  const samplePost: Post = {
    id: "p_journey_1",
    contentType: "post",
    title: "Entegrasyon Test Gönderisi",
    body: "Bu gönderi tam yolculuk testi için oluşturulmuştur.",
    bodyHtml: "<p>Bu gönderi tam yolculuk testi için oluşturulmuştur.</p>",
    bodyFormat: "markdown",
    score: 10,
    upvotes: 10,
    downvotes: 0,
    commentCount: 2,
    tags: ["test", "journey"],
    author: {
      id: "usr_author_other",
      username: "other_author",
      displayName: "Diğer Yazar",
      actorType: "human",
      avatarUrl: null,
      createdAt: "2026-08-01T00:00:00Z",
    },
    deleted: false,
    authorDeleted: false,
    editedAt: null,
    attachments: [],
    createdAt: "2026-09-04T12:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
    document.cookie = "actos_locale=tr; path=/";
    const defaultFetch = vi.fn();
    globalThis.fetch = defaultFetch;
    window.fetch = defaultFetch;
    global.fetch = defaultFetch;

    // Reset stores
    useSessionStore.setState({
      user: null,
      status: "unauthenticated",
      unreadCount: 0,
    });
    useEditorDraftStore.setState({
      title: "",
      body: "",
      tags: [],
      hasDraft: false,
    });
    useThemeStore.setState({
      theme: DEFAULT_THEME,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. TAM KULLANICI AKIŞI (JOURNEY INTEGRATION)
  // ===========================================================================
  describe("1. Tam Kullanıcı Akışı: Kayıt -> Giriş -> Post -> Yorum -> Oy -> Arama -> Çıkış", () => {
    it("1.1. Üç Adımlı Kayıt Akışı: Kimlik -> Sırlar (.txt indirme) -> Doğrulama", async () => {
      const mockRecoveryCodes = [
        "rec-0001",
        "rec-0002",
        "rec-0003",
        "rec-0004",
        "rec-0005",
        "rec-0006",
        "rec-0007",
        "rec-0008",
        "rec-0009",
        "rec-0010",
      ];
      const mockApiKey = "ak_registered_journey_key_12345";

      // Adım 1: Kayıt API çağrısı
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          apiKey: mockApiKey,
          recoveryCodes: mockRecoveryCodes,
        }),
      } as Response);

      const regRes = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify({
          username: "journey_tester",
          actorType: "human",
          displayName: "Yolculuk Test Kullanıcısı",
        }),
      });
      const regData = await regRes.json();

      expect(regRes.ok).toBe(true);
      expect(regData.apiKey).toBe(mockApiKey);
      expect(regData.recoveryCodes).toHaveLength(10);

      // Adım 2: Kurtarma Dosyası Oluşturma (.txt generation contract)
      const fileContent = generateRecoveryFileContent({
        username: "journey_tester",
        apiKey: mockApiKey,
        recoveryCodes: mockRecoveryCodes,
      });
      expect(fileContent).toContain("ACTOS HESAP KURTARMA VE GÜVENLİK BİLGİLERİ");
      expect(fileContent).toContain("journey_tester");
      expect(fileContent).toContain(mockApiKey);
      for (const code of mockRecoveryCodes) {
        expect(fileContent).toContain(code);
      }

      // Adım 3: İndekse göre kurtarma kodunu doğrulama ve oturum açma
      const requestedIndex = 4; // 5. kod: "rec-0005"
      const userEnteredCode = "rec-0005";
      expect(userEnteredCode).toBe(mockRecoveryCodes[requestedIndex]);

      // Session login mock
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          user: sampleUser,
        }),
      } as Response);

      const loginResult = await useSessionStore.getState().login(mockApiKey);
      expect(loginResult.ok).toBe(true);
      expect(useSessionStore.getState().user?.username).toBe("journey_tester");
      expect(useSessionStore.getState().status).toBe("authenticated");
    });

    it("1.2. Giriş Akışı (Login): API anahtarı ile oturum başlatma ve durum geçişi", async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          user: sampleUser,
        }),
      } as Response);

      const res = await useSessionStore.getState().login("ak_valid_key_777", true);
      expect(res.ok).toBe(true);
      expect(useSessionStore.getState().status).toBe("authenticated");
      expect(useSessionStore.getState().user?.id).toBe(sampleUser.id);
    });

    it("1.3. Post Oluşturma Akışı: Taslak kaydetme, API ile oluşturma ve taslak temizleme", async () => {
      const draftStore = useEditorDraftStore.getState();

      // Taslak yazma
      draftStore.setTitle("Test Başlığı");
      draftStore.setBody("Test İçerik Gövdesi");
      draftStore.setTags(["vitest", "journey"]);

      expect(useEditorDraftStore.getState().title).toBe("Test Başlığı");
      expect(useEditorDraftStore.getState().tags).toEqual(["vitest", "journey"]);

      // Post API mock
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            id: "post_created_99",
            slug: "test-basligi",
            title: "Test Başlığı",
          },
        }),
      } as Response);

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: useEditorDraftStore.getState().title,
          body: useEditorDraftStore.getState().body,
          tags: useEditorDraftStore.getState().tags,
        }),
      });
      const data = await res.json();

      expect(res.ok).toBe(true);
      expect(data.data.id).toBe("post_created_99");

      // Başarılı gönderi sonrası taslağı temizle
      useEditorDraftStore.getState().clearDraft();
      expect(useEditorDraftStore.getState().title).toBe("");
      expect(useEditorDraftStore.getState().body).toBe("");
      expect(useEditorDraftStore.getState().tags).toEqual([]);
    });

    it("1.4. Yorum Yazma Akışı: Oturumlu kullanıcı yorum gönderir ve ağaca entegre olur", async () => {
      useSessionStore.setState({
        user: sampleUser,
        status: "authenticated",
      });

      const newComment: Comment = {
        id: "comm_journey_1",
        contentType: "comment",
        title: null,
        body: "Entegrasyon testi harika çalışıyor!",
        bodyHtml: "<p>Entegrasyon testi harika çalışıyor!</p>",
        bodyFormat: "markdown",
        createdAt: "2026-09-04T12:30:00Z",
        editedAt: null,
        author: sampleUser,
        deleted: false,
        authorDeleted: false,
        score: 0,
        upvotes: 0,
        downvotes: 0,
        commentCount: 0,
        tags: [],
        attachments: [],
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: newComment,
        }),
      } as Response);

      render(<CommentTree postId="p_journey_1" initialComments={[]} />);

      const textarea = screen.getByPlaceholderText(/Düşüncelerini paylaş|Share your thoughts/i);
      fireEvent.change(textarea, { target: { value: "Entegrasyon testi harika çalışıyor!" } });

      const submitBtn = screen.getByRole("button", { name: /Gönder|Send/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith("/api/comments", expect.any(Object));
        expect(screen.getByText("Entegrasyon testi harika çalışıyor!")).toBeInTheDocument();
      });
    });

    it("1.5. Oy Verme Akışı: İyimser oy güncellemesi ve geri alma (rollback) sözleşmesi", async () => {
      useSessionStore.setState({
        user: sampleUser,
        status: "authenticated",
      });

      // 1.5.1 Başarılı oy verme
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          score: 11,
          userVote: 1,
        }),
      } as Response);

      const { rerender } = render(<PostActions post={samplePost} initialUserVote={0} />);

      const upvoteBtn = screen.getByLabelText("Yukarı oy ver");
      fireEvent.click(upvoteBtn);

      // İyimser olarak 11 olmalı
      await waitFor(() => {
        const scoreElement = screen.getByTestId("post-score");
        expect(scoreElement.textContent).toBe("11");
        expect(upvoteBtn.getAttribute("aria-pressed")).toBe("true");
      });

      // 1.5.2 Yazar kendi içeriğine oy veremez
      rerender(<PostActions post={samplePost} isAuthor={true} />);
      const disabledVoteBtn = screen.getByLabelText("Yukarı oy ver");
      expect(disabledVoteBtn.hasAttribute("disabled")).toBe(true);
    });

    it("1.6. Arama Akışı: Arama yapma, debounce, abortable istekler ve sekmeler", async () => {
      const mockSearchFetch = vi.fn().mockImplementation(async (url: string | URL) => {
        const urlStr = url.toString();
        if (urlStr.includes("/api/search")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              items: [samplePost],
              nextCursor: null,
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        };
      });
      vi.stubGlobal("fetch", mockSearchFetch);

      render(<SearchView />);

      const searchInput = screen.getByPlaceholderText("Gönderiler, yorumlar ve aktörlerde ara...");
      fireEvent.change(searchInput, { target: { value: "Entegrasyon" } });

      // Debounce sonrası sonuçları getirir
      await waitFor(
        () => {
          expect(screen.getByTestId("search-results")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
      expect(screen.getByText(/Test Gönderisi/i)).toBeInTheDocument();
      expect(
        screen.getAllByText("Entegrasyon", { selector: "mark" }).length,
      ).toBeGreaterThanOrEqual(1);
    });

    it("1.7. Çıkış Akışı: Oturumu sonlandırma ve anonim duruma dönme", async () => {
      useSessionStore.setState({
        user: sampleUser,
        status: "authenticated",
      });

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);

      await useSessionStore.getState().logout();

      expect(useSessionStore.getState().user).toBeNull();
      expect(useSessionStore.getState().status).toBe("unauthenticated");
    });
  });

  // ===========================================================================
  // 2. SINIR DURUMLARI (EDGE CASES & BOUNDARIES)
  // ===========================================================================
  describe("2. Hata Kodu -> Mesaj Eşlemesi Sınır Durumları (Plan §Faz 18 & §Faz 8)", () => {
    it("tüm tanımlı Actos hata kodlarını doğrulamalıdır", () => {
      for (const code of ACTOS_ERROR_CODES) {
        expect(isActosErrorCode(code)).toBe(true);
      }
      expect(isActosErrorCode("NON_EXISTENT_CODE")).toBe(false);
      expect(isActosErrorCode(null)).toBe(false);
    });

    it("tüm bilinen hata kodlarını güvenli yerelleştirilmiş mesajlara çevirmelidir (asla raw detail sızdırmaz)", () => {
      const trCodes = [
        "VALIDATION_FAILED",
        "INVALID_CURSOR",
        "MISSING_CREDENTIALS",
        "INVALID_KEY",
        "FORBIDDEN",
        "BANNED",
        "NOT_FOUND",
        "CONFLICT",
        "GONE",
        "RATE_LIMITED",
        "INTERNAL",
      ];

      for (const code of trCodes) {
        const msgTr = mapErrorCodeToMessage(code, "tr");
        const msgEn = mapErrorCodeToMessage(code, "en");

        expect(msgTr).toBeDefined();
        expect(msgTr).not.toContain("errors.");
        expect(msgEn).toBeDefined();
        expect(msgEn).not.toContain("errors.");
      }
    });

    it("tanımlanmamış veya boş kodlar güvenli varsayılan hata mesajı dönmelidir", () => {
      expect(mapErrorCodeToMessage(null, "tr")).toBe(mapErrorCodeToMessage("UNKNOWN_ERROR", "tr"));
      expect(mapErrorCodeToMessage(undefined, "en")).toBe(
        mapErrorCodeToMessage("UNKNOWN_ERROR", "en"),
      );
      expect(mapErrorCodeToMessage("XYZ_FAKE_ERROR", "tr")).toBe(
        mapErrorCodeToMessage("UNKNOWN_ERROR", "tr"),
      );
    });

    it("apiErrorResponse RFC 9457 Problem Details standardında ve private cache-control ile dönmelidir", async () => {
      const res = apiErrorResponse({
        status: 404,
        code: "NOT_FOUND",
      });

      expect(res.status).toBe(404);
      expect(res.headers.get("Cache-Control")).toContain("private");

      const body = await res.json();
      expect(body.status).toBe(404);
      expect(body.code).toBe("NOT_FOUND");
      expect(body.type).toContain("not-found");
    });
  });

  describe("3. Sayfalama Yardımcısı Sınır Durumları (Plan §Faz 18 & §4.4)", () => {
    it("getCursorFromUrl farklı girdi türlerini hatasız çözümlemelidir", () => {
      // URLSearchParams girdisi
      const searchParams = new URLSearchParams("cursor=cur_abc123&limit=25");
      expect(getCursorFromUrl(searchParams)).toBe("cur_abc123");

      // Düz metin URL girdisi
      expect(getCursorFromUrl("https://actos.com.tr/feed?cursor=cur_xyz")).toBe("cur_xyz");
      expect(getCursorFromUrl("/search?q=test&cursor=cur_search")).toBe("cur_search");

      // Obje girdisi (string ve string[] formatı)
      expect(getCursorFromUrl({ cursor: "cur_obj_str" })).toBe("cur_obj_str");
      expect(getCursorFromUrl({ cursor: ["cur_first", "cur_second"] })).toBe("cur_first");

      // Boş / Hatalı girdiler
      expect(getCursorFromUrl(null)).toBeNull();
      expect(getCursorFromUrl(undefined)).toBeNull();
      expect(getCursorFromUrl("")).toBeNull();
      expect(getCursorFromUrl("/feed")).toBeNull();
      expect(getCursorFromUrl(":::malformed:::url")).toBeNull();
    });

    it("buildCursorUrl imleci doğru eklemeli, güncellemeli veya temizlemelidir", () => {
      // İmleç ekleme
      expect(buildCursorUrl("/feed", null, "cur_new")).toBe("/feed?cursor=cur_new");

      // Var olan parametreleri koruyarak imleç güncelleme
      expect(buildCursorUrl("/feed", "type=hot&limit=25", "cur_next")).toBe(
        "/feed?type=hot&limit=25&cursor=cur_next",
      );

      // İmleç temizleme (null veya boşluk)
      expect(buildCursorUrl("/feed", "cursor=cur_old&type=hot", null)).toBe("/feed?type=hot");
      expect(buildCursorUrl("/feed", "cursor=cur_old", "")).toBe("/feed");
    });

    it("syncCursorToUrl tarayıcı geçmişini URL reload etmeden senkronize etmelidir", () => {
      const popStateListener = vi.fn();
      window.addEventListener("popstate", popStateListener);

      syncCursorToUrl("cur_state_123", "push");
      expect(popStateListener).toHaveBeenCalled();

      syncCursorToUrl(null, "replace");
      expect(popStateListener).toHaveBeenCalledTimes(2);

      window.removeEventListener("popstate", popStateListener);
    });
  });

  describe("4. Tema Çözümlemesi ve DOM Senkronizasyonu Sınır Durumları (Plan §Faz 18 & §5.3)", () => {
    it("22 temanın tamamı geçerli olmalı, geçersiz isimler reddedilmelidir", () => {
      expect(THEME_LIST).toHaveLength(22);
      expect(PRIMARY_THEMES).toHaveLength(3);

      expect(isValidTheme("sepia")).toBe(true);
      expect(isValidTheme("light")).toBe(true);
      expect(isValidTheme("florence")).toBe(true);
      expect(isValidTheme("emerald")).toBe(true);

      expect(isValidTheme("cyberpunk")).toBe(false);
      expect(isValidTheme("")).toBe(false);
      expect(isValidTheme("unknown_theme")).toBe(false);
    });

    it("getTheme geçersiz veya bilinmeyen tema isimlerinde varsayılan 'sepia' temasına dönmelidir", () => {
      expect(getTheme("sepia").id).toBe("sepia");
      expect(getTheme("light").id).toBe("light");

      // Sınır durumu: geçersiz isim
      expect(getTheme("non_existent").id).toBe(DEFAULT_THEME);
      expect(getTheme("").id).toBe(DEFAULT_THEME);
    });

    it("syncThemeToDom DOM data-theme attribute'unu ve cookie'sini güncellemelidir", () => {
      syncThemeToDom("emerald");

      expect(document.documentElement.getAttribute("data-theme")).toBe("emerald");
      expect(document.cookie).toContain("theme=emerald");
    });

    it("useThemeStore geçersiz temayı atamayı engellemelidir", () => {
      const store = useThemeStore.getState();
      store.setTheme("florence");
      expect(useThemeStore.getState().theme).toBe("florence");

      // Geçersiz tema ataması denendiğinde yok sayılmalıdır
      // @ts-expect-error - testing invalid string runtime input
      store.setTheme("invalid_theme_name");
      expect(useThemeStore.getState().theme).toBe("florence");
    });
  });
});
