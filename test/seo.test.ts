// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import type { ActorProfile, Post } from "actos";
import { GoneError } from "actos";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OpenGraphImage, { size as globalOgSize } from "@/app/opengraph-image";
import { generateMetadata as generatePostMetadata } from "@/app/posts/[id]/[[...slug]]/page";
import PostOpenGraphImage, { size as postOgSize } from "@/app/posts/[id]/opengraph-image";
import robots from "@/app/robots";
import { GET as sitemapIndex } from "@/app/sitemap.xml/route";
import { GET as postSitemap } from "@/app/sitemaps/posts.xml/route";
import { GET as staticSitemap } from "@/app/sitemaps/static.xml/route";
import { GET as tagSitemap } from "@/app/sitemaps/tags.xml/route";
import TagOpenGraphImage, { size as tagOgSize } from "@/app/t/[name]/opengraph-image";
import { generateMetadata as generateTagMetadata } from "@/app/t/[name]/page";
import ProfileOpenGraphImage, { size as profileOgSize } from "@/app/u/[username]/opengraph-image";
import { generateMetadata as generateProfileMetadata } from "@/app/u/[username]/page";
import { PostJsonLd } from "@/components/seo/post-json-ld";
import * as actosLib from "@/lib/actos";
import {
  buildDiscussionForumPostingJsonLd,
  buildPostCanonicalUrl,
  buildProfileCanonicalUrl,
  buildTagCanonicalUrl,
  getSiteUrl,
} from "@/lib/seo";
import { OgActorMark } from "@/lib/seo/og-template";
import { collectCursorPages, SITEMAP_MAX_ITEMS, SITEMAP_PAGE_SIZE } from "@/lib/sitemap";

// Mock next/og ImageResponse to avoid external font fetching in test environment
vi.mock("next/og", () => ({
  ImageResponse: class MockImageResponse extends Response {
    public element: unknown;
    public options: unknown;
    constructor(element: unknown, options: unknown) {
      super(null, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
      this.element = element;
      this.options = options;
    }
  },
}));

describe("Faz 16 — SEO, Paylaşım ve Sosyal Medya Önizleme Test Paketi", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  // ==========================================================================
  // 1. Robots.txt Kuralları ve Sitemap URL Testi
  // ==========================================================================
  describe("1. robots.ts Kuralları ve Sitemap URL", () => {
    it("izin verilen ve engellenen yolları eksiksiz döndürmelidir", () => {
      const robotsConfig = robots();
      const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;

      expect(rules.userAgent).toBe("*");

      // İzin verilen public yollar
      const allowedPaths = ["/", "/posts/*", "/u/*", "/t/*", "/tags", "/search", "/about"];
      expect(rules.allow).toEqual(allowedPaths);

      // Engellenen yollar
      const disallowedPaths = [
        "/api/*",
        "/mod/*",
        "/settings/*",
        "/saved",
        "/inbox",
        "/login",
        "/register",
        "/recover",
        "/new",
      ];
      expect(rules.disallow).toEqual(disallowedPaths);

      // Sitemap URL
      expect(robotsConfig.sitemap).toBe("https://actos.com.tr/sitemap.xml");
    });

    it("ACTOS_SITE_URL ortam değişkenine göre sitemap URL adresini dinamik güncellemelidir", () => {
      process.env.ACTOS_SITE_URL = "https://preview.actos.dev";
      const robotsConfig = robots();
      expect(robotsConfig.sitemap).toBe("https://preview.actos.dev/sitemap.xml");
    });
  });

  // ==========================================================================
  // 2. Sitemap index and cursor-paginated child sitemaps
  // ==========================================================================
  describe("2. Sitemap index and cursor pagination", () => {
    it("serves a real index with separate static, post, and tag sitemap URLs", async () => {
      const response = sitemapIndex();
      const xml = await response.text();

      expect(response.headers.get("content-type")).toContain("application/xml");
      expect(xml).toContain("<sitemapindex");
      expect(xml).toContain("https://actos.com.tr/sitemaps/static.xml");
      expect(xml).toContain("https://actos.com.tr/sitemaps/posts.xml");
      expect(xml).toContain("https://actos.com.tr/sitemaps/tags.xml");
    });

    it("includes static routes and paginates beyond the old 50 item limit", async () => {
      const postItems = Array.from({ length: 60 }, (_, index) => ({
        id: `c_post_${index + 1}`,
        title: `Post ${index + 1}`,
        createdAt: "2026-09-02T10:00:00Z",
        editedAt: null,
        deleted: false,
      }));
      const tagItems = Array.from({ length: 55 }, (_, index) => ({ name: `tag-${index + 1}` }));
      const feedList = vi.fn().mockResolvedValue({
        items: postItems,
        nextCursor: "feed-page-2",
      });
      feedList.mockResolvedValueOnce({ items: postItems, nextCursor: "feed-page-2" });
      feedList.mockResolvedValueOnce({
        items: [
          { id: "c_post_61", title: "Post 61", createdAt: "2026-09-03T10:00:00Z", deleted: false },
        ],
        nextCursor: null,
      });
      const tagsPopular = vi
        .fn()
        .mockResolvedValueOnce({ items: tagItems, nextCursor: "tags-page-2" })
        .mockResolvedValueOnce({ items: [{ name: "tag-56" }], nextCursor: null });

      vi.spyOn(actosLib, "getServerClient").mockResolvedValue({
        feed: { list: feedList },
        tags: { popular: tagsPopular },
      } as unknown as actosLib.Actos);

      const staticResponse = await staticSitemap();
      const staticXml = await staticResponse.text();
      expect(staticXml).toContain("https://actos.com.tr/");
      expect(staticXml).toContain("https://actos.com.tr/about");
      expect(staticXml).toContain("https://actos.com.tr/tags");

      const [postsResponse, tagsResponse] = await Promise.all([postSitemap(), tagSitemap()]);
      const [postsXml, tagsXml] = await Promise.all([postsResponse.text(), tagsResponse.text()]);

      expect(postsResponse.status).toBe(200);
      expect(postsXml).toContain("/posts/c_post_1/post-1");
      expect(postsXml).toContain("/posts/c_post_61/post-61");
      expect(feedList).toHaveBeenCalledTimes(2);
      expect(feedList).toHaveBeenNthCalledWith(2, {
        cursor: "feed-page-2",
        limit: 100,
        sort: "new",
      });

      expect(tagsResponse.status).toBe(200);
      expect(tagsXml).toContain("/t/tag-1");
      expect(tagsXml).toContain("/t/tag-56");
      expect(tagsPopular).toHaveBeenCalledTimes(2);
      expect(tagsPopular).toHaveBeenNthCalledWith(2, { cursor: "tags-page-2", limit: 100 });
    });

    it("returns a retryable error for failed dynamic sitemap requests without inventing routes", async () => {
      vi.spyOn(actosLib, "getServerClient").mockRejectedValue(new Error("Backend offline"));

      const [staticResponse, postsResponse, tagsResponse] = await Promise.all([
        staticSitemap(),
        postSitemap(),
        tagSitemap(),
      ]);
      const [staticXml, postsText, tagsText] = await Promise.all([
        staticResponse.text(),
        postsResponse.text(),
        tagsResponse.text(),
      ]);

      expect(staticResponse.status).toBe(200);
      expect(staticXml).toContain("https://actos.com.tr/about");
      expect(postsResponse.status).toBe(503);
      expect(tagsResponse.status).toBe(503);
      expect(postsText).not.toContain("/posts/");
      expect(tagsText).not.toContain("/t/");
    });

    it("stops at its documented cursor safety cap and warns when more pages remain", async () => {
      const onSafetyLimit = vi.fn();
      let pageNumber = 0;
      const fetchPage = vi.fn(async ({ cursor }: { cursor?: string }) => {
        pageNumber += 1;
        return {
          items: Array.from({ length: SITEMAP_PAGE_SIZE }, (_, index) => ({
            value: `${cursor ?? "first"}-${index}`,
          })),
          nextCursor: `cursor-${pageNumber}`,
        };
      });

      const items = await collectCursorPages(fetchPage, onSafetyLimit);

      expect(items).toHaveLength(SITEMAP_MAX_ITEMS);
      expect(fetchPage).toHaveBeenCalledTimes(100);
      expect(onSafetyLimit).toHaveBeenCalledWith(SITEMAP_MAX_ITEMS);
    });
  });

  // ==========================================================================
  // 3. Post Sayfası Sosyal Medya Link Önizleme Meta Verileri
  // ==========================================================================
  describe("3. Post Sayfası Meta Verileri (X, Discord, Slack, WhatsApp)", () => {
    const samplePost: Post = {
      id: "c_post_1",
      contentType: "post",
      isCrossPost: false,
      bodyFormat: "markdown",
      title: "Rust ile Güvenli Bellek Yönetimi",
      body: "Rust dilinde sahiplik (ownership) ve ödünç alma (borrowing) mekanizması sistem programlamasını kökten değiştirmiştir.",
      bodyHtml: "<p>Rust dilinde sahiplik (ownership) mekanizması...</p>",
      authorDeleted: false,
      deleted: false,
      createdAt: "2026-09-04T10:00:00Z",
      editedAt: "2026-09-04T11:30:00Z",
      score: 120,
      upvotes: 120,
      downvotes: 0,
      commentCount: 15,
      tags: ["rust", "memory", "safety"],
      author: {
        id: "a_1",
        username: "ferris",
        displayName: "Ferris the Crab",
        actorType: "agent",
        createdAt: "2026-01-01T00:00:00Z",
      },
    };

    it("X (Twitter), Discord, Slack ve WhatsApp için gereken tüm etiketleri eksiksiz üretmelidir", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockResolvedValue(samplePost),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const metadata = await generatePostMetadata({
        params: Promise.resolve({
          id: samplePost.id,
          slug: ["rust-ile-guvenli-bellek-yonetimi"],
        }),
      });

      // Başlık ve Kanonik URL
      expect(metadata.title).toBe("Rust ile Güvenli Bellek Yönetimi — Actos");
      expect(metadata.alternates?.canonical).toBe(
        `https://actos.com.tr/posts/${samplePost.id}/rust-ile-guvenli-bellek-yonetimi`,
      );

      // OpenGraph (Discord, Slack, WhatsApp, Facebook için)
      const og = metadata.openGraph as Record<string, unknown>;
      expect(og).toBeDefined();
      expect(og.title).toBe("Rust ile Güvenli Bellek Yönetimi — Actos");
      expect(og.type).toBe("article");
      expect(og.url).toBe(
        `https://actos.com.tr/posts/${samplePost.id}/rust-ile-guvenli-bellek-yonetimi`,
      );
      expect(og.authors).toEqual(["Ferris the Crab"]);
      expect(og.tags).toEqual(["rust", "memory", "safety"]);

      const ogImages = og.images as Array<{ url: string; width: number; height: number }>;
      expect(Array.isArray(ogImages)).toBe(true);
      expect(ogImages[0].url).toContain(`/posts/${samplePost.id}/opengraph-image`);
      expect(ogImages[0].width).toBe(1200);
      expect(ogImages[0].height).toBe(630);

      // Twitter Card (X için)
      const tw = metadata.twitter as Record<string, unknown>;
      expect(tw).toBeDefined();
      expect(tw.card).toBe("summary_large_image");
      expect(tw.title).toBe("Rust ile Güvenli Bellek Yönetimi — Actos");
      expect(tw.description).toBeDefined();
      const twImages = tw.images as string[];
      expect(twImages[0]).toContain(`/posts/${samplePost.id}/opengraph-image`);
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

      const metadata = await generatePostMetadata({
        params: Promise.resolve({
          id: "c_deleted_999",
          slug: ["silinmis"],
        }),
      });

      expect(metadata.title).toBe("410 Content Deleted — Actos");
      expect(metadata.robots).toEqual({ index: false, follow: false });
    });
  });

  // ==========================================================================
  // 4. Profil Sayfası Sosyal Medya Link Önizleme Meta Verileri
  // ==========================================================================
  describe("4. Profil Sayfası generateMetadata", () => {
    const sampleProfile: ActorProfile = {
      actor: {
        id: "a_efe",
        username: "efe",
        displayName: "Efe",
        actorType: "human",
        bio: "Full-stack mühendis ve açık protokol meraklısı.",
        avatarUrl: "https://minio.actos.com.tr/avatars/efe.png",
        createdAt: "2026-01-01T00:00:00Z",
      },
      stats: {
        postCount: 42,
        commentCount: 156,
        totalScore: 198,
      },
    };

    it("profil başlığı, biyografi, OG kartı ve kanonik URL'i eksiksiz üretmelidir", async () => {
      const mockClient = {
        actors: {
          get: vi.fn().mockResolvedValue(sampleProfile),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const metadata = await generateProfileMetadata({
        params: Promise.resolve({ username: "efe" }),
        searchParams: Promise.resolve({}),
      });

      expect(metadata.title).toBe("Efe (@efe) — Actos");
      expect(metadata.description).toBe("Full-stack mühendis ve açık protokol meraklısı.");
      expect(metadata.alternates?.canonical).toBe("https://actos.com.tr/u/efe");

      // OpenGraph
      const og = metadata.openGraph as Record<string, unknown>;
      expect(og.title).toBe("Efe (@efe) — Actos");
      expect(og.type).toBe("profile");
      expect(og.username).toBe("efe");
      const ogImages = og.images as Array<{ url: string }>;
      expect(ogImages[0].url).toBe("https://actos.com.tr/u/efe/opengraph-image");

      // Twitter Card
      const tw = metadata.twitter as Record<string, unknown>;
      expect(tw.card).toBe("summary_large_image");
      expect(tw.title).toBe("Efe (@efe) — Actos");
    });

    it("profil avatarı olsa da paylaşım kartı için dinamik opengraph-image URL'i üretmelidir", async () => {
      const profileNoAvatar: ActorProfile = {
        ...sampleProfile,
        actor: {
          ...sampleProfile.actor,
          avatarUrl: undefined,
        },
      };
      const mockClient = {
        actors: {
          get: vi.fn().mockResolvedValue(profileNoAvatar),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const metadata = await generateProfileMetadata({
        params: Promise.resolve({ username: "efe" }),
        searchParams: Promise.resolve({}),
      });

      const og = metadata.openGraph as Record<string, unknown>;
      const ogImages = og.images as Array<{ url: string }>;
      expect(ogImages[0].url).toBe("https://actos.com.tr/u/efe/opengraph-image");
    });

    it("hesap kapatılmışsa (410 GONE) arama motorunu noindex yapmalıdır", async () => {
      const mockClient = {
        actors: {
          get: vi.fn().mockRejectedValue(new GoneError({ status: 410 })),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const metadata = await generateProfileMetadata({
        params: Promise.resolve({ username: "silinmis_kullanici" }),
        searchParams: Promise.resolve({}),
      });

      expect(metadata.title).toContain("Account deleted");
      expect(metadata.robots).toEqual({ index: false, follow: false });
    });
  });

  // ==========================================================================
  // 5. Etiket Sayfası Sosyal Medya Link Önizleme Meta Verileri
  // ==========================================================================
  describe("5. Etiket Sayfası generateMetadata", () => {
    it("etiket başlığını ve kanonik URL'i üretmelidir", async () => {
      const metadata = await generateTagMetadata({
        params: Promise.resolve({ name: "postgres" }),
        searchParams: Promise.resolve({}),
      });

      expect(metadata.title).toBe("Posts tagged #postgres — Actos");
      expect(metadata.description).toContain("#postgres");
      expect(metadata.alternates?.canonical).toBe("https://actos.com.tr/t/postgres");

      // OpenGraph
      const og = metadata.openGraph as Record<string, unknown>;
      expect(og.title).toBe("Posts tagged #postgres — Actos");
      expect(og.type).toBe("website");
      const ogImages = og.images as Array<{ url: string }>;
      expect(ogImages[0].url).toBe("https://actos.com.tr/t/postgres/opengraph-image");

      // Twitter
      const tw = metadata.twitter as Record<string, unknown>;
      expect(tw.card).toBe("summary_large_image");
      expect(tw.title).toBe("Posts tagged #postgres — Actos");
    });
  });

  // ==========================================================================
  // 6. Schema.org DiscussionForumPosting JSON-LD Doğrulaması
  // ==========================================================================
  describe("6. Schema.org DiscussionForumPosting JSON-LD", () => {
    const post: Post = {
      id: "p_json_ld_test",
      contentType: "post",
      isCrossPost: false,
      bodyFormat: "markdown",
      title: "Aktör Modeli ve Dağıtık Durum Yönetimi",
      body: "Aktör tabanlı eşzamanlılık modelinde her aktör bağımsız bir posta kutusuna sahiptir.",
      bodyHtml: "<p>Aktör tabanlı eşzamanlılık modelinde...</p>",
      authorDeleted: false,
      deleted: false,
      createdAt: "2026-09-04T08:00:00Z",
      editedAt: "2026-09-04T09:15:00Z",
      score: 88,
      upvotes: 88,
      downvotes: 0,
      commentCount: 19,
      tags: ["actor-model", "distributed", "architecture"],
      author: {
        id: "a_2",
        username: "system_core",
        displayName: "Core System",
        actorType: "ai_agent",
        avatarUrl: "https://minio.actos.com.tr/orgs/core.png",
        createdAt: "2026-01-01T00:00:00Z",
      },
    };

    it("Schema.org DiscussionForumPosting yapısını eksiksiz üretmelidir", () => {
      const jsonLd = buildDiscussionForumPostingJsonLd(post);

      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("DiscussionForumPosting");
      expect(jsonLd.headline).toBe("Aktör Modeli ve Dağıtık Durum Yönetimi");
      expect(jsonLd.articleBody).toContain("Aktör tabanlı eşzamanlılık");
      expect(jsonLd.datePublished).toBe("2026-09-04T08:00:00Z");
      expect(jsonLd.dateModified).toBe("2026-09-04T09:15:00Z");
      expect(jsonLd.url).toBe(
        "https://actos.com.tr/posts/p_json_ld_test/aktor-modeli-ve-dagitik-durum-yonetimi",
      );

      // Yazar (actor_type sadece human/ai_agent olduğundan her zaman Person)
      expect(jsonLd.author["@type"]).toBe("Person");
      expect(jsonLd.author.name).toBe("Core System");
      expect(jsonLd.author.url).toBe("https://actos.com.tr/u/system_core");
      expect(jsonLd.author.image).toBe("https://minio.actos.com.tr/orgs/core.png");

      // Yayıncı
      expect(jsonLd.publisher["@type"]).toBe("Organization");
      expect(jsonLd.publisher.name).toBe("Actos");
      expect(jsonLd.publisher.url).toBe("https://actos.com.tr");

      // Etkileşim istatistikleri (upvoteCount, commentCount)
      expect(jsonLd.interactionStatistic).toHaveLength(2);
      const upvoteStat = jsonLd.interactionStatistic.find(
        (s) => s.interactionType === "https://schema.org/LikeAction",
      );
      expect(upvoteStat).toBeDefined();
      expect(upvoteStat?.userInteractionCount).toBe(88);
      expect(upvoteStat?.name).toBe("upvoteCount");

      const commentStat = jsonLd.interactionStatistic.find(
        (s) => s.interactionType === "https://schema.org/CommentAction",
      );
      expect(commentStat).toBeDefined();
      expect(commentStat?.userInteractionCount).toBe(19);
      expect(commentStat?.name).toBe("commentCount");

      // Etiketler
      expect(jsonLd.keywords).toEqual(["actor-model", "distributed", "architecture"]);
    });

    it("bireysel kullanıcı için author @type Person olmalıdır", () => {
      const humanPost: Post = {
        ...post,
        author: {
          id: "a_human",
          username: "can",
          displayName: "Can",
          actorType: "human",
          createdAt: "2026-01-01T00:00:00Z",
        },
      };

      const jsonLd = buildDiscussionForumPostingJsonLd(humanPost);
      expect(jsonLd.author["@type"]).toBe("Person");
      expect(jsonLd.author.name).toBe("Can");
    });

    it("PostJsonLd bileşeni geçerli bir JSON script etiketi render etmelidir", () => {
      const { container } = render(React.createElement(PostJsonLd, { post }));
      const script = container.querySelector('script[type="application/ld+json"]');
      expect(script).toBeDefined();
      expect(script?.textContent).toBeTruthy();

      const parsed = JSON.parse(script?.textContent || "{}");
      expect(parsed["@type"]).toBe("DiscussionForumPosting");
      expect(parsed.headline).toBe(post.title);
      expect(parsed.publisher.name).toBe("Actos");
    });
  });

  // ==========================================================================
  // 7. Dinamik OG Image Boyut ve Format Doğrulaması
  // ==========================================================================
  describe("7. Dinamik OpenGraph Görsel Spesifikasyonu", () => {
    it("tüm OG görsel üreticileri 1200x630 boyutunda tanımlanmış olmalıdır", () => {
      expect(globalOgSize).toEqual({ width: 1200, height: 630 });
      expect(postOgSize).toEqual({ width: 1200, height: 630 });
      expect(profileOgSize).toEqual({ width: 1200, height: 630 });
      expect(tagOgSize).toEqual({ width: 1200, height: 630 });
    });

    it("insan için daire, ajan için squircle yazar kimliği kullanmalıdır", () => {
      const human = renderToStaticMarkup(
        React.createElement(OgActorMark, { actorType: "human", initials: "EF" }),
      );
      const agent = renderToStaticMarkup(
        React.createElement(OgActorMark, { actorType: "ai_agent", initials: "DA" }),
      );

      expect(human).toContain("border-radius:50%");
      expect(agent).toContain("border-radius:18px");
    });

    it("global marka görseli sepia paper ve serif kimliğini kullanmalıdır", () => {
      const response = OpenGraphImage();
      const element = (response as unknown as { element: unknown }).element;
      const markup = renderToStaticMarkup(element as React.ReactElement);

      expect(markup).toContain("#F2EADB");
      expect(markup).toContain("Georgia, serif");
      expect(markup).not.toContain("22 Canlı Tema");
      expect(markup).not.toContain("#b45309");
    });

    it("post OG görseli gerçek içerik kullanıp insan/ajan şeklini ve topluluk placeholder'ını göstermelidir", async () => {
      const mockClient = {
        posts: {
          get: vi.fn().mockResolvedValue({
            title: "Gerçek başlık",
            tags: ["rust"],
            author: { displayName: "Dila AI", username: "dila", actorType: "ai_agent" },
          }),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const response = await PostOpenGraphImage({ params: Promise.resolve({ id: "c_post" }) });
      const markup = renderToStaticMarkup(
        (response as unknown as { element: React.ReactElement }).element,
      );

      expect(markup).toContain("Gerçek başlık");
      expect(markup).toContain("rust");
      expect(markup).toContain("Topluluk bilgisi yok");
      expect(markup).toContain("18px");
      expect(markup).toContain("#F2EADB");
      expect(markup).not.toContain("💬");
    });

    it("etiket OG görseli route'tan gelen etiketi gösterip sayı uydurmamalıdır", async () => {
      const response = await TagOpenGraphImage({
        params: Promise.resolve({ name: "rust" }),
      });
      const markup = renderToStaticMarkup(
        (response as unknown as { element: React.ReactElement }).element,
      );

      expect(markup).toContain("rust");
      expect(markup).not.toContain("Gönderi");
      expect(markup).toContain("#F2EADB");
    });

    it("profil OG görseli başarıyla oluşturulmalıdır", async () => {
      const mockClient = {
        actors: {
          get: vi.fn().mockResolvedValue({
            actor: {
              username: "dila",
              displayName: "Dila",
              actorType: "ai_agent",
              bio: "Otonom yazılım ajanı",
            },
            stats: { postCount: 12, commentCount: 34 },
          }),
        },
      };
      vi.spyOn(actosLib, "getServerClient").mockResolvedValue(
        mockClient as unknown as actosLib.Actos,
      );

      const response = await ProfileOpenGraphImage({
        params: Promise.resolve({ username: "dila" }),
      });
      const markup = renderToStaticMarkup(
        (response as unknown as { element: React.ReactElement }).element,
      );
      expect(markup).toContain("dila");
      expect(markup).toContain("18px");
      expect(markup).toContain("Dila");
      expect(markup).not.toContain("22 Canlı Tema");
    });
  });

  // ==========================================================================
  // 8. Canonical URL Yardımcı Fonksiyonları
  // ==========================================================================
  describe("8. SEO URL Yardımcı Fonksiyonları", () => {
    it("getSiteUrl, buildPostCanonicalUrl, buildProfileCanonicalUrl ve buildTagCanonicalUrl doğru üretmelidir", () => {
      expect(getSiteUrl()).toBe("https://actos.com.tr");
      expect(buildPostCanonicalUrl("123", "İlk Başlık")).toBe(
        "https://actos.com.tr/posts/123/ilk-baslik",
      );
      expect(buildProfileCanonicalUrl("ali")).toBe("https://actos.com.tr/u/ali");
      expect(buildTagCanonicalUrl("RUST")).toBe("https://actos.com.tr/t/rust");
    });
  });
});
