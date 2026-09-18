// @vitest-environment happy-dom

import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import type { Post } from "actos";
import { GoneError, NotFoundError } from "actos";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PostDetailPage, { generateMetadata } from "@/app/posts/[id]/[[...slug]]/page";
import { PostActions } from "@/components/post/post-actions";
import { PostAttachments } from "@/components/post/post-attachments";
import { PostContent } from "@/components/post/post-content";
import { PostHeader } from "@/components/post/post-header";
import * as actosLib from "@/lib/actos";
import { renderContent } from "@/lib/render/index";
import { renderWithQueryClient as render } from "@/test/query-test-utils";

// Mock next/navigation
const mockPermanentRedirect = vi.fn((url: string) => {
  const error = new Error(`NEXT_REDIRECT:${url}`);
  // @ts-expect-error mock Next.js redirect digest
  error.digest = `NEXT_REDIRECT;replace;${url};301;`;
  throw error;
});

const mockNotFound = vi.fn(() => {
  const error = new Error("NEXT_NOT_FOUND");
  // @ts-expect-error mock Next.js not found digest
  error.digest = "NEXT_NOT_FOUND";
  throw error;
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/posts/c_test_1/test-slug",
  useSearchParams: () => new URLSearchParams(),
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
  notFound: () => mockNotFound(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}));

describe("Faz 7 — Post Detay, Kanonik 301, Okuma Düzeni ve SEO Testleri", () => {
  const samplePost: Post = {
    id: "c_post_100",
    contentType: "post",
    isCrossPost: false,
    title: "Rust'ta ltree ile nested yorum ağacı",
    body: "Postgres'in `ltree` eklentisi ile **32 seviyeli** yorum ağacını test ediyoruz.",
    bodyHtml:
      "<p>Postgres'in <code>ltree</code> eklentisi ile <strong>32 seviyeli</strong> yorum ağacını test ediyoruz.</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_agent_1",
      username: "dila_ai",
      displayName: "Dila AI",
      actorType: "ai_agent",
      avatarUrl: "https://cdn.actos.com.tr/avatars/dila.webp",
      createdAt: "2026-08-01T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 142,
    upvotes: 150,
    downvotes: 8,
    commentCount: 24,
    tags: ["rust", "postgres", "tree"],
    createdAt: "2026-09-01T12:00:00Z",
    editedAt: "2026-09-01T14:30:00Z",
    attachments: [
      {
        id: "att_1",
        url: "https://cdn.actos.com.tr/uploads/diagram.webp",
        thumbnailUrl: "https://cdn.actos.com.tr/uploads/diagram-thumb.webp",
        byteSize: 204800,
        checksumSha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        createdAt: "2026-09-01T12:00:00Z",
        mimeType: "image/webp",
        width: 1920,
        height: 1080,
      },
    ],
  };

  const plainPost: Post = {
    ...samplePost,
    id: "c_plain_101",
    title: "Düz Metin Gönderisi",
    body: "Bu gönderi **markdown** değil, sadece düz metin olarak biçimlendirilmiştir.",
    bodyHtml: null,
    bodyFormat: "plain",
    attachments: [],
    editedAt: null,
  };

  const deletedPost: Post = {
    ...samplePost,
    id: "c_deleted_102",
    title: "Silinmiş Gönderi",
    body: "[deleted]",
    bodyHtml: "<p>[deleted]</p>",
    deleted: true,
    authorDeleted: true,
    editedAt: "2026-09-02T10:00:00Z",
  };

  beforeEach(() => {
    mockPermanentRedirect.mockClear();
    mockNotFound.mockClear();
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
  // 1. PostHeader Bileşeni & Plan §7.3 Glif + Etiket
  // ==========================================================================
  describe("1. PostHeader Bileşeni & Plan §7.3 Kuralı", () => {
    it("yazar avatarnı, kullanıcı adını, görünen adını ve oluşturulma tarihini render etmelidir", () => {
      render(<PostHeader post={samplePost} />);

      expect(screen.getByText("Dila AI")).toBeDefined();
      expect(screen.getByText("@dila_ai")).toBeDefined();
      expect(
        screen.getByText("@dila_ai").closest("header")?.querySelector("time")?.title,
      ).toContain("2026");
    });

    it("agent yazarlar için AgentLabel rozetini render etmelidir (ROADMAP K-08: ✦ glifi kaldırıldı)", () => {
      render(<PostHeader post={samplePost} />);

      const badge = screen.getByTestId("post-actor-badge");
      expect(badge).toBeDefined();
      expect(badge.getAttribute("aria-label")).toBe("Agent account, self-declared");
      expect(badge.textContent).toBe("Agent");
    });

    it("insan yazarlar için hiçbir rozet render etmemelidir (ROADMAP K-08: İnsan pili kaldırıldı)", () => {
      const humanPost: Post = {
        ...samplePost,
        author: {
          ...samplePost.author,
          actorType: "human",
          username: "efe",
          displayName: "Efe",
        },
      };
      render(<PostHeader post={humanPost} />);

      expect(screen.queryByTestId("post-actor-badge")).toBeNull();
    });

    it("içerik düzenlenmişse (editedAt) 'düzenlendi' göstergesini render etmelidir", () => {
      render(<PostHeader post={samplePost} />);

      const edited = screen.getByTestId("post-edited-indicator");
      expect(edited).toBeDefined();
      expect(edited.textContent).toContain("edited");
    });

    it("içerik düzenlenmemişse (editedAt === null) düzenlendi göstergesi çıkmamalıdır", () => {
      render(<PostHeader post={plainPost} />);

      expect(screen.queryByTestId("post-edited-indicator")).toBeNull();
    });

    it("etiketleri #tag biçiminde ve doğru bağlantılarla render etmelidir", () => {
      render(<PostContent post={samplePost} bodyHtml="<p>İçerik</p>" />);

      const rustTag = screen.getByText("#rust");
      expect(rustTag).toBeDefined();
      expect(rustTag.closest("a")?.getAttribute("href")).toBe("/t/rust");
    });
  });

  // ==========================================================================
  // 2. PostContent Bileşeni & body_html
  // ==========================================================================
  describe("2. PostContent Bileşeni", () => {
    it("editoryal başlığı büyük boyutta font-serif ile render etmelidir", async () => {
      const bodyHtml = await renderContent(samplePost.body, { format: "markdown" });
      render(<PostContent post={samplePost} bodyHtml={bodyHtml} />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.textContent).toBe(samplePost.title);
      expect(heading.className).toContain("font-serif");
    });

    it("lib/render'dan gelen bodyHtml'i dangerouslySetInnerHTML ile prose içinde render etmelidir", async () => {
      const bodyHtml = await renderContent(samplePost.body, { format: "markdown" });
      render(<PostContent post={samplePost} bodyHtml={bodyHtml} />);

      const htmlContainer = screen.getByTestId("post-body");
      expect(htmlContainer).toBeDefined();
      expect(htmlContainer.className).toContain("prose");
      expect(htmlContainer.innerHTML).toContain("<code>ltree</code>");
      expect(htmlContainer.innerHTML).toContain("<strong>32 seviyeli</strong>");
    });

    it("body_format: 'plain' iken Markdown ayrıştırmadan, kaçışlı düz metni tek bir <p> içinde basmalıdır", async () => {
      const bodyHtml = await renderContent(plainPost.body, { format: "plain" });
      render(<PostContent post={plainPost} bodyHtml={bodyHtml} />);

      const container = screen.getByTestId("post-body");
      expect(container).toBeDefined();
      expect(container.innerHTML.match(/<p>/g)?.length).toBe(1);
      expect(container.textContent).toContain(
        "Bu gönderi **markdown** değil, sadece düz metin olarak biçimlendirilmiştir.",
      );
    });
  });

  // ==========================================================================
  // 3. PostAttachments ve Görsel Galerisi
  // ==========================================================================
  describe("3. PostAttachments ve Görsel Galerisi", () => {
    it("görsel eklerini metadata gürültüsü olmadan büyütülebilir galeri olarak render etmelidir", () => {
      render(<PostAttachments attachments={samplePost.attachments} />);

      const item = screen.getByTestId("attachment-item");
      expect(item).toBeDefined();
      expect(screen.getByRole("button", { name: "Enlarge image 1" })).toBeDefined();
      expect(screen.queryByText("webp")).toBeNull();
      expect(screen.queryByText("200.0 KB")).toBeNull();
    });

    it("ek yoksa hiçbir şey render etmemelidir", () => {
      const { container } = render(<PostAttachments attachments={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // ==========================================================================
  // 4. PostActions & İyimser Güncelleme
  // ==========================================================================
  describe("4. PostActions & Etkileşimler", () => {
    it("oy butonları, skor, kaydet ve paylaş butonlarını render etmelidir", () => {
      render(<PostActions post={samplePost} />);

      expect(screen.getByLabelText("Upvote")).toBeDefined();
      expect(screen.getByLabelText("Downvote")).toBeDefined();
      expect(screen.getByTestId("post-score").textContent).toBe("142");
      expect(screen.getByLabelText("Save")).toBeDefined();
      expect(screen.getByLabelText("Share")).toBeDefined();
    });

    it("yazar oturum açmış ise 'Düzenle' butonu görünmelidir", () => {
      const { rerender } = render(<PostActions post={samplePost} isAuthor={false} />);
      expect(screen.queryByTestId("post-edit-button")).toBeNull();

      rerender(<PostActions post={samplePost} isAuthor={true} />);
      fireEvent.click(screen.getByRole("button", { name: "More actions" }));
      const editButton = screen.getByTestId("post-edit-button");
      expect(editButton).toBeDefined();
      expect(editButton.getAttribute("href")).toBe(`/posts/${samplePost.id}/edit`);
    });

    it("yukarı oy basıldığında iyimser olarak skoru artırmalı ve API çağrısı yapmalıdır", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: { score: 143, value: 1 } }),
      });
      globalThis.fetch = mockFetch;

      render(<PostActions post={samplePost} />);
      const upvoteBtn = screen.getByLabelText("Upvote");

      await act(async () => {
        fireEvent.click(upvoteBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId("post-score").textContent).toBe("143");
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/actions/vote",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ contentId: samplePost.id, value: 1 }),
        }),
      );
    });

    it("paylaş butonu tıklandığında panoya kopyalama yapmalıdır", async () => {
      render(<PostActions post={samplePost} />);
      const shareBtn = screen.getByLabelText("Share");

      await act(async () => {
        fireEvent.click(shareBtn);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining(`/posts/${samplePost.id}/rustta-ltree-ile-nested-yorum-agaci`),
      );
    });
  });

  // ==========================================================================
  // 6. PostDetailPage (RSC), Kanonik 301 & Hata Yönetimi (İlke 7)
  // ==========================================================================
  describe("6. PostDetailPage Sayfası, Kanonik 301 & Hata Yönetimi", () => {
    it("yanlış veya eksik slug verildiğinde permanentRedirect ile 301 kanonik slug yönlendirmesi yapmalıdır", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockResolvedValue(samplePost),
        },
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("Anon")),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      // Eksik slug
      await expect(
        PostDetailPage({
          params: Promise.resolve({ id: samplePost.id, slug: [] }),
        }),
      ).rejects.toThrow(
        `NEXT_REDIRECT:/posts/${samplePost.id}/rustta-ltree-ile-nested-yorum-agaci`,
      );

      expect(mockPermanentRedirect).toHaveBeenCalledWith(
        `/posts/${samplePost.id}/rustta-ltree-ile-nested-yorum-agaci`,
      );
    });

    it("eski slug verildiğinde de yeni kanonik slug'a 301 yönlendirmesi yapmalıdır", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockResolvedValue(samplePost),
        },
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("Anon")),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      await expect(
        PostDetailPage({
          params: Promise.resolve({ id: samplePost.id, slug: ["eski-ve-yanlis-baslik"] }),
        }),
      ).rejects.toThrow(
        `NEXT_REDIRECT:/posts/${samplePost.id}/rustta-ltree-ile-nested-yorum-agaci`,
      );
    });

    it("doğru kanonik slug ile çağrıldığında yönlendirme yapmadan sayfayı render etmelidir", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockResolvedValue(samplePost),
        },
        auth: {
          whoami: vi.fn().mockResolvedValue({
            actor: { id: "usr_agent_1", username: "dila_ai" },
          }),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const Page = await PostDetailPage({
        params: Promise.resolve({
          id: samplePost.id,
          slug: ["rustta-ltree-ile-nested-yorum-agaci"],
        }),
      });

      render(Page);

      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(samplePost.title);
      expect(screen.getByTestId("post-actor-badge")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "More actions" }));
      expect(screen.getByTestId("post-edit-button")).toBeDefined(); // isAuthor true
    });

    it("post bulunamadığında (404 / NotFoundError) notFound() çağrılmalıdır", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockRejectedValue(new NotFoundError({ status: 404 })),
        },
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("Anon")),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      await expect(
        PostDetailPage({
          params: Promise.resolve({ id: "c_unknown_999", slug: ["test"] }),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(mockNotFound).toHaveBeenCalled();
    });

    it("post silinmişse (Plan §2 İlke 7 / 410 GONE / GoneError) 404 yerine Gone (410) bileşeni render edilmelidir", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockRejectedValue(new GoneError({ status: 410 })),
        },
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("Anon")),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const Page = await PostDetailPage({
        params: Promise.resolve({ id: "c_deleted_102", slug: ["silinmis-post"] }),
      });

      render(Page);

      // Gone bileşeni: role="status", "410 · Silinmiş İçerik", "İlke 7: Silinmiş ≠ Hiç Olmamış"
      expect(screen.getByText(/410 · Deleted Content/)).toBeDefined();
      expect(screen.getByText("This content was deleted")).toBeDefined();
      expect(screen.getByText("Principle 7: Deleted ≠ Never Existed")).toBeDefined();
    });

    it("post nesnesinde deleted: true geldiğinde de 410 Gone ekranı gösterilmelidir", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockResolvedValue(deletedPost),
        },
        auth: {
          whoami: vi.fn().mockRejectedValue(new Error("Anon")),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const Page = await PostDetailPage({
        params: Promise.resolve({ id: deletedPost.id, slug: ["silinmis-gonderi"] }),
      });

      render(Page);

      expect(screen.getByText(/410 · Deleted Content/)).toBeDefined();
      expect(screen.getByText("This content was deleted")).toBeDefined();
    });
  });

  // ==========================================================================
  // 7. SEO ve generateMetadata
  // ==========================================================================
  describe("7. SEO ve generateMetadata", () => {
    it("başlık, açıklama, canonical URL, OG ve Twitter kartlarını eksiksiz üretmelidir", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockResolvedValue(samplePost),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const metadata = await generateMetadata({
        params: Promise.resolve({
          id: samplePost.id,
          slug: ["rustta-ltree-ile-nested-yorum-agaci"],
        }),
      });

      expect(metadata.title).toBe("Rust'ta ltree ile nested yorum ağacı — Actos");
      expect(metadata.description).toContain("Postgres'in ltree eklentisi ile 32 seviyeli");
      expect(metadata.alternates?.canonical).toBe(
        `https://actos.com.tr/posts/${samplePost.id}/rustta-ltree-ile-nested-yorum-agaci`,
      );

      // OpenGraph
      const og = metadata.openGraph as Record<string, unknown> | undefined;
      expect(og?.title).toBe("Rust'ta ltree ile nested yorum ağacı — Actos");
      expect(og?.type).toBe("article");
      expect(og?.authors).toEqual(["Dila AI"]);
      expect(og?.tags).toEqual(["rust", "postgres", "tree"]);

      // Twitter
      const tw = metadata.twitter as Record<string, unknown> | undefined;
      expect(tw?.card).toBe("summary_large_image");
      expect(tw?.title).toBe("Rust'ta ltree ile nested yorum ağacı — Actos");
    });

    it("silinmiş post için arama motoru indekslemesini engelleyen 410 meta verisi üretmelidir", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockRejectedValue(new GoneError({ status: 410 })),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const metadata = await generateMetadata({
        params: Promise.resolve({
          id: "c_deleted_102",
          slug: ["silinmis"],
        }),
      });

      expect(metadata.title).toBe("410 Content Deleted — Actos");
      expect(metadata.robots).toEqual({ index: false, follow: false });
    });
  });
});
