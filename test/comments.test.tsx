// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CommentNode } from "actos";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeepCommentPage from "@/app/posts/[id]/comments/[commentId]/page";
import { CommentForm } from "@/components/comments/comment-form";
import { CommentNodeComponent } from "@/components/comments/comment-node";
import { CommentTree } from "@/components/comments/comment-tree";
import * as actosLib from "@/lib/actos";
import { getDraft, saveDraft } from "@/lib/drafts";
import { useSessionStore } from "@/lib/stores/session-store";

// Mock Next.js navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/posts/c_post_1/rust-ltree",
  useSearchParams: () => mockSearchParams,
  notFound: vi.fn(),
}));

// Mock Next.js headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}));

describe("Faz 8 — Yorumlar, Hiyerarşik Ağaç ve Sözleşme Testleri", () => {
  // 7 seviyeli iç içe yorum ağacı fixtürü
  const createDeepCommentTree = (): CommentNode => {
    let current: CommentNode = {
      id: "node_lvl_7",
      contentType: "comment",
      body: "7. Seviye derin yorum (cutoff sonrası)",
      bodyFormat: "markdown",
      author: {
        id: "usr_7",
        username: "yazar_7",
        displayName: "Yazar 7",
        actorType: "human",
        createdAt: "2026-08-01T00:00:00Z",
      },
      authorDeleted: false,
      deleted: false,
      score: 1,
      upvotes: 1,
      downvotes: 0,
      commentCount: 0,
      tags: [],
      createdAt: "2026-09-01T12:06:00Z",
      editedAt: null,
      replies: [],
    };

    for (let lvl = 6; lvl >= 1; lvl--) {
      current = {
        id: `node_lvl_${lvl}`,
        contentType: "comment",
        body: `${lvl}. Seviye yorum metni`,
        bodyFormat: "markdown",
        author: {
          id: `usr_${lvl}`,
          username: `yazar_${lvl}`,
          displayName: `Yazar ${lvl}`,
          actorType: lvl % 2 === 0 ? "ai_agent" : "human",
          createdAt: "2026-08-01T00:00:00Z",
        },
        authorDeleted: false,
        deleted: false,
        score: lvl * 3,
        upvotes: lvl * 3,
        downvotes: 0,
        commentCount: 1,
        tags: [],
        createdAt: `2026-09-01T12:0${lvl - 1}:00Z`,
        editedAt: lvl === 2 ? "2026-09-01T12:30:00Z" : null,
        replies: [current],
      };
    }

    return current;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    window.sessionStorage.clear();
    document.cookie = "actos_locale=tr; path=/";
    useSessionStore.setState({
      user: null,
      status: "unauthenticated",
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  describe("1. Kritik Girinti Sınırı (Plan §4.5: 6. Seviye Cutoff)", () => {
    it("girinti 6. seviyede durmalı ve 7. seviyedeki çocukları yerine 'Devamını gör →' bağlantısı basmalıdır", () => {
      const rootNode = createDeepCommentTree(); // node_lvl_1 kök, node_lvl_6 6. seviye, node_lvl_7 7. seviye
      const collapsedIds = new Set<string>();

      render(
        <CommentNodeComponent
          comment={rootNode}
          postId="c_post_100"
          depth={0}
          maxDepth={6}
          collapsedIds={collapsedIds}
          onToggleCollapse={vi.fn()}
        />,
      );

      // Seviye 1'den 6'ya kadar olan yorum metinleri ağaçta render edilmelidir
      expect(screen.getByText("1. Seviye yorum metni")).toBeDefined();
      expect(screen.getByText("2. Seviye yorum metni")).toBeDefined();
      expect(screen.getByText("3. Seviye yorum metni")).toBeDefined();
      expect(screen.getByText("4. Seviye yorum metni")).toBeDefined();
      expect(screen.getByText("5. Seviye yorum metni")).toBeDefined();
      expect(screen.getByText("6. Seviye yorum metni")).toBeDefined();

      // 7. seviye doğrudan render EDİLMEMELİDİR
      expect(screen.queryByText("7. Seviye derin yorum (cutoff sonrası)")).toBeNull();

      // Bunun yerine 6. seviyenin altında "Devamını gör →" bağlantısı yer almalıdır
      const continueLink = screen.getByTestId("continue-thread-link");
      expect(continueLink).toBeDefined();
      expect(continueLink.getAttribute("href")).toBe("/posts/c_post_100/comments/node_lvl_6");
      expect(continueLink.textContent).toContain("Devamını gör →");
    });
  });

  describe("2. Silinmiş Yorum Sözleşmesi (YAPILACAKLAR.md §3)", () => {
    it("deleted: true yorumu boolean bayrağıyla tanımalı, içeriği maskelemeli fakat altındaki yanıtları korumalıdır", () => {
      const deletedNodeWithLivingChild: CommentNode = {
        id: "c_deleted_parent",
        contentType: "comment",
        body: "Bu gizli metin asla görünmemeli!",
        bodyFormat: "markdown",
        author: {
          id: "usr_ghost",
          username: "eski_yazar",
          displayName: "Eski Yazar",
          actorType: "human",
          createdAt: "2026-08-01T00:00:00Z",
        },
        authorDeleted: true,
        deleted: true, // YAPILACAKLAR.md §3 boolean kontrolü!
        score: 0,
        upvotes: 0,
        downvotes: 0,
        commentCount: 1,
        tags: [],
        createdAt: "2026-09-01T10:00:00Z",
        editedAt: null,
        replies: [
          {
            id: "c_living_child",
            contentType: "comment",
            body: "Üstteki yorum silinmiş olsa bile ben hayattayım!",
            bodyFormat: "markdown",
            author: {
              id: "usr_child",
              username: "can",
              displayName: "Can",
              actorType: "human",
              createdAt: "2026-08-02T00:00:00Z",
            },
            authorDeleted: false,
            deleted: false,
            score: 5,
            upvotes: 5,
            downvotes: 0,
            commentCount: 0,
            tags: [],
            createdAt: "2026-09-01T11:00:00Z",
            editedAt: null,
            replies: [],
          },
        ],
      };

      render(
        <CommentNodeComponent
          comment={deletedNodeWithLivingChild}
          postId="c_post_1"
          depth={0}
          maxDepth={6}
          collapsedIds={new Set()}
          onToggleCollapse={vi.fn()}
        />,
      );

      // 1. Gerçek gizli metin görünmemeli, yerine soluk [Bu yorum silindi] gelmelidir
      expect(screen.queryByText("Bu gizli metin asla görünmemeli!")).toBeNull();
      const notice = screen.getByTestId("deleted-comment-notice");
      expect(notice.textContent).toContain("Bu yorum silindi");

      // 2. Yazar maskelenmelidir
      expect(screen.getByTestId("deleted-author").textContent).toContain("silindi");

      // 3. Çocuk yorum sağlam kalmalı ve normal render edilmelidir
      expect(screen.getByText("Üstteki yorum silinmiş olsa bile ben hayattayım!")).toBeDefined();
      expect(screen.getByText("Can")).toBeDefined();
      expect(screen.getByText("@can")).toBeDefined();
    });

    it("authorDeleted: true fakat deleted: false durumunda yazar maskelenmeli ama içerik korunmalıdır", () => {
      const authorDeletedNode: CommentNode = {
        id: "c_auth_del",
        contentType: "comment",
        body: "Yazar hesabını sildi fakat bu faydalı yorum duruyor.",
        bodyFormat: "markdown",
        author: {
          id: "usr_gone",
          username: "silindi",
          displayName: "silindi",
          actorType: "human",
          createdAt: "2026-01-01T00:00:00Z",
        },
        authorDeleted: true,
        deleted: false,
        score: 12,
        upvotes: 12,
        downvotes: 0,
        commentCount: 0,
        tags: [],
        createdAt: "2026-09-01T10:00:00Z",
        editedAt: null,
        replies: [],
      };

      render(
        <CommentNodeComponent
          comment={authorDeletedNode}
          postId="c_post_1"
          depth={0}
          maxDepth={6}
          collapsedIds={new Set()}
          onToggleCollapse={vi.fn()}
        />,
      );

      // Yorum gövdesi görünür
      expect(
        screen.getByText("Yazar hesabını sildi fakat bu faydalı yorum duruyor."),
      ).toBeDefined();
      // Yazar maskeli
      expect(screen.getByText("[silindi]")).toBeDefined();
    });
  });

  describe("3. Katlanabilir Ağaç (Collapsible Threads - Plan §4.5)", () => {
    it("[-] veya sol çizgiye basıldığında alt ağacı katlamalı ve '[+] @yazar (N yanıt gizlendi)' özeti göstermelidir", () => {
      const node: CommentNode = {
        id: "c_collapse_root",
        contentType: "comment",
        body: "Ana yorum metni",
        bodyFormat: "markdown",
        author: {
          id: "usr_1",
          username: "efe",
          displayName: "Efe",
          actorType: "human",
          createdAt: "2026-08-01T00:00:00Z",
        },
        authorDeleted: false,
        deleted: false,
        score: 10,
        upvotes: 10,
        downvotes: 0,
        commentCount: 2,
        tags: [],
        createdAt: "2026-09-01T12:00:00Z",
        editedAt: null,
        replies: [
          {
            id: "c_child_1",
            contentType: "comment",
            body: "1. Çocuk yanıt",
            bodyFormat: "markdown",
            author: {
              id: "usr_2",
              username: "dila_ai",
              displayName: "Dila AI",
              actorType: "ai_agent",
              createdAt: "2026-08-01T00:00:00Z",
            },
            authorDeleted: false,
            deleted: false,
            score: 5,
            upvotes: 5,
            downvotes: 0,
            commentCount: 1,
            tags: [],
            createdAt: "2026-09-01T12:05:00Z",
            editedAt: null,
            replies: [
              {
                id: "c_grandchild_1",
                contentType: "comment",
                body: "Torun yanıt",
                bodyFormat: "markdown",
                author: {
                  id: "usr_3",
                  username: "taylan",
                  displayName: "Taylan",
                  actorType: "human",
                  createdAt: "2026-08-01T00:00:00Z",
                },
                authorDeleted: false,
                deleted: false,
                score: 2,
                upvotes: 2,
                downvotes: 0,
                commentCount: 0,
                tags: [],
                createdAt: "2026-09-01T12:10:00Z",
                editedAt: null,
                replies: [],
              },
            ],
          },
        ],
      };

      render(<CommentTree postId="c_post_1" initialComments={[node]} />);

      // Başlangıçta açık durum: ana yorum ve yanıtları görünür
      expect(screen.getByText("Ana yorum metni")).toBeDefined();
      expect(screen.getByText("1. Çocuk yanıt")).toBeDefined();
      expect(screen.getByText("Torun yanıt")).toBeDefined();

      // [-] butonuna bas
      const collapseBtns = screen.getAllByTestId("collapse-button");
      fireEvent.click(collapseBtns[0]);

      // Katlanmış durumda: gövde gizlenir, özet satırı görünür (toplam 2 yanıt gizlendi)
      expect(screen.queryByText("Ana yorum metni")).toBeNull();
      expect(screen.queryByText("1. Çocuk yanıt")).toBeNull();

      const summary = screen.getByTestId("collapsed-summary");
      expect(summary).toBeDefined();
      expect(summary.textContent).toContain("@efe");
      expect(summary.textContent).toContain("2 yanıt gizlendi");

      // [+] butonuna veya özete basıldığında tekrar açılmalıdır
      const expandBtn = screen.getByTestId("expand-button");
      fireEvent.click(expandBtn);

      expect(screen.getByText("Ana yorum metni")).toBeDefined();
      expect(screen.getByText("1. Çocuk yanıt")).toBeDefined();
    });
  });

  describe("4. İlke 2: Anonim Kullanıcıda Taslak Saklama (Yazılan Metin Asla Kaybolmaz)", () => {
    it("oturum açmamış kullanıcı yorum yazıp Gönder'e bastığında metni sessionStorage'a kaydetmeli ve login'e yönlendirmelidir", () => {
      render(<CommentForm postId="c_post_999" />);

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, {
        target: { value: "Bu çok önemli bir yorum ve kaybolmamalı!" },
      });

      const submitButton = screen.getByRole("button", { name: /gönder/i });
      fireEvent.click(submitButton);

      // 1. sessionStorage'a kaydedilmiş mi?
      const expectedKey = "comment_c_post_999_root";
      const savedText = getDraft(expectedKey);
      expect(savedText).toBe("Bu çok önemli bir yorum ve kaybolmamalı!");

      // 2. Login URL'ine yönlendirilmiş mi?
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/login?returnUrl="));
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining(`draftKey=${expectedKey}`));
    });

    it("login sonrası geri dönüldüğünde saklanan taslak otomatik olarak forma dolmalıdır", () => {
      const draftKey = "comment_c_post_999_root";
      saveDraft(draftKey, "Önceki oturumdan kalan değerli düşünceler...");
      mockSearchParams.set("draftKey", draftKey);

      render(<CommentForm postId="c_post_999" />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Önceki oturumdan kalan değerli düşünceler...");
    });
  });

  describe("5. Sahiplik, Düzenleme ve Silme Yetki Kontrolleri", () => {
    const authorNode: CommentNode = {
      id: "c_author_comment",
      contentType: "comment",
      body: "Orijinal yorum metni",
      bodyFormat: "markdown",
      author: {
        id: "usr_efe",
        username: "efe",
        displayName: "Efe",
        actorType: "human",
        createdAt: "2026-08-01T00:00:00Z",
      },
      authorDeleted: false,
      deleted: false,
      score: 3,
      upvotes: 3,
      downvotes: 0,
      commentCount: 0,
      tags: [],
      createdAt: "2026-09-01T12:00:00Z",
      editedAt: null,
      replies: [],
    };

    it("farklı bir kullanıcı oturum açtığında Düzenle ve Sil butonları GÖRÜNMEMELİDİR", () => {
      useSessionStore.setState({
        user: {
          id: "usr_other",
          username: "baskasi",
          displayName: "Başkası",
          actorType: "human",
          role: "user",
        },
        status: "authenticated",
      });

      render(
        <CommentNodeComponent
          comment={authorNode}
          postId="c_post_1"
          depth={0}
          maxDepth={6}
          collapsedIds={new Set()}
          onToggleCollapse={vi.fn()}
        />,
      );

      expect(screen.queryByRole("button", { name: /düzenle/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /sil/i })).toBeNull();
    });

    it("yorumun yazarı oturum açtığında Düzenle ve Sil seçenekleri görünmeli, satır içi düzenlenebilmelidir", async () => {
      useSessionStore.setState({
        user: {
          id: "usr_efe",
          username: "efe",
          displayName: "Efe",
          actorType: "human",
          role: "user",
        },
        status: "authenticated",
      });

      // Mock fetch for PATCH
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          data: { ...authorNode, body: "Güncellenmiş yeni metin" },
        }),
      } as Response);

      const onUpdateMock = vi.fn();

      render(
        <CommentNodeComponent
          comment={authorNode}
          postId="c_post_1"
          depth={0}
          maxDepth={6}
          collapsedIds={new Set()}
          onToggleCollapse={vi.fn()}
          onCommentUpdated={onUpdateMock}
        />,
      );

      const editBtn = screen.getByRole("button", { name: /düzenle/i });
      expect(editBtn).toBeDefined();

      // Düzenleme formunu aç
      fireEvent.click(editBtn);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Orijinal yorum metni");

      fireEvent.change(textarea, { target: { value: "Güncellenmiş yeni metin" } });

      const saveBtn = screen.getByRole("button", { name: /kaydet/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/comments/c_author_comment",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ body: "Güncellenmiş yeni metin" }),
          }),
        );
        expect(onUpdateMock).toHaveBeenCalledWith("c_author_comment", "Güncellenmiş yeni metin");
      });
    });

    it("silme onay diyaloguyla silindiğinde DELETE çağrılmalı ve yorum anında silindi durumuna geçmelidir", async () => {
      useSessionStore.setState({
        user: {
          id: "usr_efe",
          username: "efe",
          displayName: "Efe",
          actorType: "human",
          role: "user",
        },
        status: "authenticated",
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      const onDeleteMock = vi.fn();

      render(
        <CommentNodeComponent
          comment={authorNode}
          postId="c_post_1"
          depth={0}
          maxDepth={6}
          collapsedIds={new Set()}
          onToggleCollapse={vi.fn()}
          onCommentDeleted={onDeleteMock}
        />,
      );

      const deleteBtn = screen.getByRole("button", { name: /sil/i });
      fireEvent.click(deleteBtn);

      // Onay diyalogu açılır
      expect(screen.getByText("Yorumu Sil")).toBeDefined();

      // Diyalog içindeki Sil butonuna tıkla
      const confirmDeleteBtn = screen.getByTestId("confirm-delete-button");
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/comments/c_author_comment",
          expect.objectContaining({
            method: "DELETE",
          }),
        );
        expect(onDeleteMock).toHaveBeenCalledWith("c_author_comment");
      });
    });
  });

  describe("6. Derin Dal Sayfası (app/posts/[id]/comments/[commentId]/page.tsx)", () => {
    it("ilgili yorumu kök alarak render etmeli ve '← Tüm post ve yorumları gör' bağlantısını sunmalıdır", async () => {
      const rootComment: CommentNode = {
        id: "c_root_1",
        contentType: "comment",
        body: "Postgres ltree gerçekten çok pratik bir eklenti. 32 seviyeye kadar path tutabilmesi büyük avantaj.",
        bodyHtml: "<p>Postgres ltree gerçekten çok pratik bir eklenti.</p>",
        bodyFormat: "markdown",
        author: {
          id: "usr_human_1",
          username: "efe",
          displayName: "Efe",
          actorType: "human",
          createdAt: "2026-08-10T00:00:00Z",
        },
        authorDeleted: false,
        deleted: false,
        score: 28,
        upvotes: 29,
        downvotes: 1,
        commentCount: 0,
        tags: [],
        createdAt: "2026-09-01T10:00:00Z",
        editedAt: null,
        replies: [],
      };

      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        posts: {
          get: vi.fn().mockResolvedValue({
            id: "c_post_1",
            title: "Rust'ta ltree ile nested yorum ağacı",
            body: "Postgres'in ltree eklentisi.",
            bodyHtml: "<p>Postgres'in ltree eklentisi.</p>",
          }),
        },
        comments: {
          get: vi.fn().mockResolvedValue({ comment: rootComment, ancestors: [] }),
          list: vi.fn().mockResolvedValue([]),
        },
      } as unknown as actosLib.Actos);

      const pageJsx = await DeepCommentPage({
        params: Promise.resolve({
          id: "c_post_1",
          commentId: "c_root_1",
        }),
      });

      render(pageJsx);

      // Üstte geri dön bağlantısı bulunmalı
      const backLink = screen.getByText("← Tüm post ve yorumları gör");
      expect(backLink).toBeDefined();

      // Kök yorum ve çocukları render edilmelidir
      expect(screen.getByText(/gerçekten çok pratik bir eklenti/)).toBeDefined();
    });

    it("yorum kalıcı olarak silinmişse (410 GONE) Gone bileşenini render etmelidir", async () => {
      const { GoneError } = await import("actos");
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        posts: {
          get: vi.fn().mockRejectedValue(new Error("not found")),
        },
        comments: {
          get: vi.fn().mockRejectedValue(new GoneError({ status: 410 })),
          list: vi.fn().mockResolvedValue([]),
        },
      } as unknown as actosLib.Actos);

      const pageJsx = await DeepCommentPage({
        params: Promise.resolve({
          id: "c_post_1",
          commentId: "c_gone_1",
        }),
      });

      render(pageJsx);

      expect(screen.getByText("Bu yorum silindi")).toBeDefined();
    });

    it("backend erişilemediğinde sahte yorum göstermez, hata durumu render eder (ROADMAP.md P0-02)", async () => {
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        posts: {
          get: vi.fn().mockRejectedValue(new Error("connection failed")),
        },
        comments: {
          get: vi.fn().mockRejectedValue(new Error("connection failed")),
          list: vi.fn().mockResolvedValue([]),
        },
      } as unknown as actosLib.Actos);

      const pageJsx = await DeepCommentPage({
        params: Promise.resolve({
          id: "c_post_1",
          commentId: "c_unreachable_1",
        }),
      });

      render(pageJsx);

      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.queryByText(/Derin dal kök yorumu/)).toBeNull();
    });
  });

  describe("7. Düzenlenmiş Yorum Rozeti & Glif+Etiket (Plan §7.3)", () => {
    it("düzenlenmiş yorumda 'düzenlendi' rozeti ve yazarın Glif + Etiket rozetini basmalıdır", () => {
      const editedNode: CommentNode = {
        id: "c_edited_1",
        contentType: "comment",
        body: "Bu yorum bir kez güncellendi.",
        bodyFormat: "markdown",
        author: {
          id: "usr_agent_99",
          username: "ai_helper",
          displayName: "AI Yardımcı",
          actorType: "ai_agent",
          createdAt: "2026-08-01T00:00:00Z",
        },
        authorDeleted: false,
        deleted: false,
        score: 8,
        upvotes: 8,
        downvotes: 0,
        commentCount: 0,
        tags: [],
        createdAt: "2026-09-01T12:00:00Z",
        editedAt: "2026-09-01T12:45:00Z", // Düzenlenmiş!
        replies: [],
      };

      render(
        <CommentNodeComponent
          comment={editedNode}
          postId="c_post_1"
          depth={0}
          maxDepth={6}
          collapsedIds={new Set()}
          onToggleCollapse={vi.fn()}
        />,
      );

      // Düzenlendi rozeti
      const editedBadge = screen.getByTestId("edited-badge");
      expect(editedBadge).toBeDefined();
      expect(editedBadge.textContent).toContain("düzenlendi");

      // Glif + Etiket: ✦ AI agent
      expect(screen.getByText("AI agent")).toBeDefined();
    });
  });
});
