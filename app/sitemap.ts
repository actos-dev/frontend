import type { Post, Tag } from "actos";
import type { MetadataRoute } from "next";
import { getServerClient } from "@/lib/actos";
import { MOCK_FEED_POSTS } from "@/lib/feed-mock";
import { getSiteUrl } from "@/lib/seo";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Sitemap generator for Actos.
 * Plan §Faz 16 Gereksinim 3.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  // 1. Statik Sayfalar
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/tags`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/themes`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // 2. Popüler Etiketler
  let tags: Tag[] = [];
  try {
    const client = await getServerClient();
    const tagsPage = await client.tags.popular({ limit: 50 });
    tags = tagsPage.items;
  } catch {
    // Mock etiket fallback
    const allMockTags = Array.from(new Set(MOCK_FEED_POSTS.flatMap((p) => p.tags || [])));
    tags = allMockTags.map((name) => ({
      name,
      postCount: 1,
      createdAt: now.toISOString(),
    }));
  }

  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${siteUrl}/t/${encodeURIComponent(tag.name.toLowerCase())}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // 3. Son Gönderiler
  let posts: Post[] = [];
  try {
    const client = await getServerClient();
    const feedPage = await client.feed.list({ limit: 50 });
    posts = feedPage.items as unknown as Post[];
  } catch {
    posts = MOCK_FEED_POSTS;
  }

  const postRoutes: MetadataRoute.Sitemap = posts
    .filter((post) => !post.deleted)
    .map((post) => {
      const slug = slugify(post.title || "post");
      const lastModifiedDate = post.editedAt || post.createdAt;
      const parsedDate = lastModifiedDate ? new Date(lastModifiedDate) : now;

      return {
        url: `${siteUrl}/posts/${post.id}/${slug}`,
        lastModified: Number.isNaN(parsedDate.getTime()) ? now : parsedDate,
        changeFrequency: "weekly",
        priority: 0.8,
      };
    });

  return [...staticRoutes, ...tagRoutes, ...postRoutes];
}
