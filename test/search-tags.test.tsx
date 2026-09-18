// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { Actor, Post, Tag } from "actos";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as searchRoute } from "@/app/api/search/route";
import SearchPage from "@/app/search/page";
import TagDetailPage from "@/app/t/[name]/page";
import TagsPage from "@/app/tags/page";
import { PostCard } from "@/components/feed/post-card";
import { ActorSearchCard } from "@/components/search/actor-search-card";
import { CommentSearchCard } from "@/components/search/comment-search-card";
import { SearchView } from "@/components/search/search-view";
import { TagStream } from "@/components/tags/tag-stream";
import { TagsDirectory } from "@/components/tags/tags-directory";
import { Highlight } from "@/components/ui/highlight";
import * as actosLib from "@/lib/actos";
import { renderWithQueryClient as render } from "@/test/query-test-utils";

// Mock next/navigation
let currentMockParams = new URLSearchParams();
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
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

const localStorageValues = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    clear: () => localStorageValues.clear(),
    getItem: (key: string) => localStorageValues.get(key) ?? null,
    removeItem: (key: string) => localStorageValues.delete(key),
    setItem: (key: string, value: string) => localStorageValues.set(key, value),
  },
});

describe("Faz 12 — Keşfet: Etiketler ve Arama Test Paketi", () => {
  const samplePopularTags: Tag[] = [
    { name: "rust", postCount: 128, createdAt: "2026-08-01T00:00:00Z" },
    { name: "postgres", postCount: 94, createdAt: "2026-08-02T00:00:00Z" },
    { name: "ai", postCount: 71, createdAt: "2026-08-03T00:00:00Z" },
    { name: "typescript", postCount: 65, createdAt: "2026-08-04T00:00:00Z" },
  ];

  const samplePost: Post = {
    id: "c_post_101",
    contentType: "post",
    title: "Rust dilinde bellek güvenliği ve performans",
    body: "Rust sahiplik (ownership) ve ödünç alma (borrowing) kuralları ile bellek sızıntılarını derleme zamanında engeller.",
    bodyHtml: "<p>Rust sahiplik (ownership) kuralları...</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_1",
      username: "rustacean_efe",
      displayName: "Efe Demirel",
      actorType: "human",
      avatarUrl: null,
      createdAt: "2026-08-01T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 42,
    upvotes: 45,
    downvotes: 3,
    commentCount: 8,
    tags: ["rust", "sistem"],
    createdAt: "2026-08-10T12:00:00Z",
    editedAt: null,
    attachments: [],
  };

  const sampleComment: Post = {
    id: "c_comment_201",
    contentType: "comment",
    title: null,
    body: "Postgres indexleme stratejilerinde B-Tree ve GIN farkını iyi anlamak gerekiyor.",
    bodyHtml: "<p>Postgres indexleme stratejilerinde B-Tree...</p>",
    bodyFormat: "markdown",
    author: {
      id: "usr_2",
      username: "db_expert",
      displayName: "Veritabanı Uzmanı",
      actorType: "human",
      avatarUrl: null,
      createdAt: "2026-08-05T00:00:00Z",
    },
    authorDeleted: false,
    deleted: false,
    score: 15,
    upvotes: 16,
    downvotes: 1,
    commentCount: 0,
    tags: [],
    createdAt: "2026-08-11T14:00:00Z",
    editedAt: null,
    attachments: [],
  };

  const sampleActor: Actor = {
    id: "usr_3",
    username: "ai_researcher",
    displayName: "AI Araştırmacı",
    actorType: "ai_agent",
    avatarUrl: null,
    bio: "Otonom ajan sistemleri ve dağıtık çıkarım mimarileri.",
    createdAt: "2026-08-01T00:00:00Z",
  };

  // biome-ignore lint/suspicious/noExplicitAny: test mock
  let mockClient: any;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    currentMockParams = new URLSearchParams();
    window.localStorage.clear();
    originalFetch = global.fetch;

    mockClient = {
      tags: {
        popular: vi.fn().mockResolvedValue({
          items: samplePopularTags,
          nextCursor: null,
        }),
        posts: vi.fn().mockResolvedValue({
          items: [samplePost],
          nextCursor: "cursor_p2",
        }),
        search: vi.fn().mockResolvedValue([{ name: "rust" }, { name: "postgres" }]),
      },
      search: {
        posts: vi.fn().mockResolvedValue({
          items: [samplePost],
          nextCursor: "cursor_s1",
        }),
        comments: vi.fn().mockResolvedValue({
          items: [sampleComment],
          nextCursor: null,
        }),
        actors: vi.fn().mockResolvedValue({
          items: [sampleActor],
          nextCursor: null,
        }),
      },
    };

    vi.spyOn(actosLib, "getServerClient").mockResolvedValue(mockClient);

    // Default mock fetch for client components
    global.fetch = vi.fn().mockImplementation(async (url: string | URL) => {
      const urlStr = url.toString();

      if (urlStr.includes("/api/tags/search")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            data: [{ name: "postgres", postCount: 94 }],
          }),
        };
      }

      if (urlStr.includes("/api/tags/rust/posts")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            items: [samplePost],
            nextCursor: "cursor_p2",
          }),
        };
      }

      if (urlStr.includes("/api/search")) {
        const parsedUrl = new URL(urlStr, "http://localhost");
        const type = parsedUrl.searchParams.get("type") || "post";
        const q = parsedUrl.searchParams.get("q") || "";

        if (q === "nonexistent") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              items: [],
              nextCursor: null,
            }),
          };
        }

        if (type === "comment") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              items: [sampleComment],
              nextCursor: null,
            }),
          };
        }

        if (type === "actor") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              items: [sampleActor],
              nextCursor: null,
            }),
          };
        }

        if (type === "tag") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              items: [{ name: "rust", postCount: 128 }],
              nextCursor: null,
            }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            ok: true,
            items: [samplePost],
            nextCursor: "cursor_s1",
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({ ok: true }),
      };
      // biome-ignore lint/suspicious/noExplicitAny: mock fetch
    }) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("1. Sorgu Vurgulama (Query Highlighting)", () => {
    it("aranan kelimeleri <mark> ve semantik vurgu sınıfı ile sarmalıdır", () => {
      render(<Highlight text="Rust ile yüksek performanslı sistemler" query="rust" />);

      const mark = screen.getByText("Rust");
      expect(mark.tagName.toLowerCase()).toBe("mark");
      expect(mark.className).toContain("bg-bg-muted");
      expect(mark.className).toContain("text-fg");
    });

    it("büyük/küçük harf duyarsız ve çoklu kelimeli sorguları vurgulamalıdır", () => {
      render(<Highlight text="Rust ve postgres veritabanı mimarisi" query="rust postgres" />);

      const rustMark = screen.getByText("Rust");
      const postgresMark = screen.getByText("postgres");
      expect(rustMark.tagName.toLowerCase()).toBe("mark");
      expect(postgresMark.tagName.toLowerCase()).toBe("mark");
    });

    it("sorgu boş olduğunda metni düz olarak render etmelidir", () => {
      const { container } = render(<Highlight text="Düz başlık metni" query="" />);
      expect(container.querySelector("mark")).toBeNull();
      expect(screen.getByText("Düz başlık metni")).toBeInTheDocument();
    });

    it("PostCard içinde başlık, gövde özeti ve yazar adında vurgulama yapmalıdır", () => {
      render(<PostCard post={samplePost} highlightQuery="rust" />);

      const marks = screen.getAllByText(/rust/i);
      expect(marks.length).toBeGreaterThanOrEqual(2);
      expect(marks[0].tagName.toLowerCase()).toBe("mark");
    });

    it("CommentSearchCard içinde yazar ve gövde vurgulanmalıdır", () => {
      render(<CommentSearchCard comment={sampleComment} highlightQuery="postgres" />);

      const mark = screen.getByText("Postgres", { selector: "mark" });
      expect(mark).toBeInTheDocument();
      expect(screen.getByText("Yoruma git")).toBeInTheDocument();
    });

    it("ActorSearchCard içinde kullanıcı adı ve bio vurgulanmalıdır", () => {
      render(<ActorSearchCard actor={sampleActor} highlightQuery="ai" />);

      const mark = screen.getByText("AI", { selector: "mark" });
      expect(mark).toBeInTheDocument();
      expect(screen.getByText("_researcher")).toBeInTheDocument();
    });
  });

  describe("2. Etiketler Dizini (/tags)", () => {
    it("popüler etiketleri ve gönderi sayılarını listelemelidir", async () => {
      const pageJsx = await TagsPage();
      render(pageJsx);

      expect(screen.getByText("Etiketler")).toBeInTheDocument();
      expect(screen.getByText("rust")).toBeInTheDocument();
      expect(screen.getByText("128 gönderi")).toBeInTheDocument();
      expect(screen.getByText("postgres")).toBeInTheDocument();
      expect(screen.getByText("94 gönderi")).toBeInTheDocument();
    });

    it("arama/filtreleme kutusuna yazıldığında etiketleri filtrelemelidir", () => {
      render(<TagsDirectory initialTags={samplePopularTags} />);

      const input = screen.getByPlaceholderText("Etiket ara veya filtrele...");
      fireEvent.change(input, { target: { value: "post" } });

      // postgres görünmeli, ai gizlenmeli
      expect(screen.getByText("postgres")).toBeInTheDocument();
      expect(screen.queryByText("ai")).toBeNull();
    });

    it("eşleşmeyen etiket aramasında EmptyState göstermelidir", () => {
      render(<TagsDirectory initialTags={samplePopularTags} />);

      const input = screen.getByPlaceholderText("Etiket ara veya filtrele...");
      fireEvent.change(input, { target: { value: "bulunmayanyabanci" } });

      expect(screen.getByText("Eşleşen etiket bulunamadı.")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Aramanızla eşleşen etiket bulunamadı. Farklı bir terim deneyebilirsiniz.",
        ),
      ).toBeInTheDocument();
    });

    it("temizleme butonu ile arama kutusunu sıfırlamalıdır", () => {
      render(<TagsDirectory initialTags={samplePopularTags} />);

      const input = screen.getByPlaceholderText("Etiket ara veya filtrele...");
      fireEvent.change(input, { target: { value: "rust" } });

      const clearBtn = screen.getByLabelText("Aramayı temizle");
      fireEvent.click(clearBtn);

      expect(input).toHaveValue("");
      expect(screen.getByText("postgres")).toBeInTheDocument();
    });
  });

  describe("3. Etiket Sayfası (/t/[name])", () => {
    it("etiket başlığını, gönderi sayısını ve gönderi listesini render etmelidir", async () => {
      const pageJsx = await TagDetailPage({
        params: Promise.resolve({ name: "rust" }),
        searchParams: Promise.resolve({}),
      });

      render(pageJsx);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.textContent).toContain("rust");
      expect(screen.getByText("Rust dilinde bellek güvenliği ve performans")).toBeInTheDocument();
      expect(screen.getByText("Daha fazla")).toBeInTheDocument();
    });

    it("etikette gönderi bulunmadığında boş durum ve /new butonu göstermelidir", () => {
      render(<TagStream tagName="bos_etiket" initialPosts={[]} initialNextCursor={null} />);

      expect(screen.getByText("Posts tagged #bos_etiket will appear here.")).toBeInTheDocument();

      const newBtn = screen.getByRole("link", { name: "Create Post" });
      expect(newBtn).toBeInTheDocument();
      expect(newBtn).toHaveAttribute("href", "/new");
    });
  });

  describe("4. Arama Sayfası (/search) ve Sekmeler", () => {
    it("etiket aramasını SDK etiket kaynağına yönlendirmelidir", async () => {
      const response = await searchRoute(
        new NextRequest("http://localhost/api/search?q=RuSt&type=tag"),
      );
      const body = await response.json();

      expect(mockClient.tags.search).toHaveBeenCalledWith("rust");
      expect(body).toMatchObject({
        ok: true,
        items: [{ name: "rust" }, { name: "postgres" }],
        nextCursor: null,
      });
    });

    it("arama terimi girilmediğinde ilk boş durumu göstermelidir", () => {
      render(<SearchView />);

      expect(
        screen.getByText(
          "Aramak istediğiniz terimi yazın; gönderiler, yorumlar ve aktörler arasında arayın.",
        ),
      ).toBeInTheDocument();
    });

    it("yazma sırasında anında Skeleton yükleme durumu göstermelidir", () => {
      render(<SearchView />);

      const input = screen.getByPlaceholderText("Gönderiler, yorumlar ve aktörlerde ara...");
      fireEvent.change(input, { target: { value: "rust" } });

      // Kritik Kural: Yazılır yazılmaz anında Skeleton yükleme durumu görünür
      expect(screen.getByTestId("search-loading")).toBeInTheDocument();
    });

    it("300ms debounce sonrası istek yapıp sonuçları render etmelidir", async () => {
      render(<SearchView />);

      const input = screen.getByPlaceholderText("Gönderiler, yorumlar ve aktörlerde ara...");
      fireEvent.change(input, { target: { value: "rust" } });

      await waitFor(() => {
        expect(screen.getByTestId("search-results")).toBeInTheDocument();
      });

      expect(screen.getByText(/bellek güvenliği ve performans/i)).toBeInTheDocument();
      const rustMarks = screen.getAllByText("Rust", { selector: "mark" });
      expect(rustMarks.length).toBeGreaterThanOrEqual(1);
    });

    it("hızlı yazımlarda önceki isteği AbortController ile iptal etmelidir", async () => {
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      let resolveFirstSearch: any;
      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      // biome-ignore lint/suspicious/noExplicitAny: test mock
      (global.fetch as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstSearch = () =>
              resolve({
                ok: true,
                json: async () => ({ ok: true, items: [samplePost], nextCursor: null }),
              });
          }),
      );

      render(<SearchView />);

      const input = screen.getByPlaceholderText("Gönderiler, yorumlar ve aktörlerde ara...");
      fireEvent.change(input, { target: { value: "r" } });

      // Wait 300ms debounce so first request fires and starts inflight
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // User types while first request is inflight -> aborts previous inflight request
      fireEvent.change(input, { target: { value: "ru" } });

      expect(abortSpy).toHaveBeenCalled();
      resolveFirstSearch?.();
    });

    it("sekmeler arası (post -> comment -> actor) geçiş yapılabilmelidir", async () => {
      render(<SearchView />);

      const input = screen.getByPlaceholderText("Gönderiler, yorumlar ve aktörlerde ara...");
      fireEvent.change(input, { target: { value: "test" } });

      // Yorumlar sekmesine geç
      const commentTab = screen.getByRole("tab", { name: "Yorumlar" });
      fireEvent.click(commentTab);

      await waitFor(() => {
        expect(screen.getByTestId("comment-search-card")).toBeInTheDocument();
      });
      expect(screen.getByText(/Postgres indexleme stratejilerinde/i)).toBeInTheDocument();

      // Aktörler sekmesine geç
      const actorTab = screen.getByRole("tab", { name: "Aktörler" });
      fireEvent.click(actorTab);

      await waitFor(() => {
        expect(screen.getByTestId("actor-search-card")).toBeInTheDocument();
      });
      expect(screen.getByText("AI Araştırmacı")).toBeInTheDocument();
      expect(screen.getByText("ai_researcher")).toBeInTheDocument();
    });

    it("kayıt tabanlı etiket sekmesinde eşleşen etiketleri göstermelidir", async () => {
      render(<SearchView />);

      fireEvent.change(screen.getByPlaceholderText("Gönderiler, yorumlar ve aktörlerde ara..."), {
        target: { value: "rust" },
      });
      fireEvent.click(screen.getByRole("tab", { name: "Etiketler" }));

      await waitFor(() => {
        expect(screen.getByText("rust", { selector: "mark" }).closest("a")).toHaveAttribute(
          "href",
          "/t/rust",
        );
      });
    });

    it("başarılı sorguları yalnızca cihazdaki son aramalarda saklamalıdır", async () => {
      render(<SearchView />);

      const input = screen.getByPlaceholderText("Gönderiler, yorumlar ve aktörlerde ara...");
      fireEvent.change(input, { target: { value: "rust" } });

      await waitFor(() => {
        expect(screen.getByTestId("search-results")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("Aramayı temizle"));
      expect(screen.getByText("Son aramalar")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "rust" })).toBeInTheDocument();
      expect(JSON.parse(window.localStorage.getItem("actos:recent-searches") || "[]")).toEqual([
        "rust",
      ]);
    });

    it("sıfır sonuç durumunda kullanıcıyı bilgilendiren EmptyState göstermelidir", async () => {
      render(<SearchView />);

      const input = screen.getByPlaceholderText("Gönderiler, yorumlar ve aktörlerde ara...");
      fireEvent.change(input, { target: { value: "nonexistent" } });

      await waitFor(() => {
        expect(screen.getByText("‘nonexistent’ için hiçbir sonuç bulunamadı.")).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          "Farklı anahtar kelimeler deneyebilir veya etiketler sayfasına göz atabilirsiniz.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Etiketlere Göz At" })).toHaveAttribute(
        "href",
        "/tags",
      );
    });

    it("temizleme butonu (x) tıklandığında aramayı ve sonuçları sıfırlamalıdır", async () => {
      render(<SearchView />);

      const input = screen.getByPlaceholderText("Gönderiler, yorumlar ve aktörlerde ara...");
      fireEvent.change(input, { target: { value: "rust" } });

      await waitFor(() => {
        expect(screen.getByTestId("search-results")).toBeInTheDocument();
      });

      const clearBtn = screen.getByLabelText("Aramayı temizle");
      fireEvent.click(clearBtn);

      expect(input).toHaveValue("");
      expect(
        screen.getByText(
          "Aramak istediğiniz terimi yazın; gönderiler, yorumlar ve aktörler arasında arayın.",
        ),
      ).toBeInTheDocument();
    });

    it("SearchPage sayfasını ve Suspense kabuğunu başarıyla render etmelidir", () => {
      render(<SearchPage />);
      expect(screen.getByRole("heading", { name: "Arama" })).toBeInTheDocument();
    });
  });
});
