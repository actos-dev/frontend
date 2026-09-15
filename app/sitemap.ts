import type { Post, Tag } from "actos";
import type { MetadataRoute } from "next";
import { getServerClient } from "@/lib/actos";
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
  ];

  // 2. Popüler Etiketler
  let tags: Tag[] = [];
  try {
    const client = await getServerClient();
    const tagsPage = await client.tags.popular({ limit: 50 });
    tags = tagsPage.items;
  } catch (error) {
    // No fabricated tag routes: the sitemap just omits them until the next
    // successful build (ROADMAP.md P0-02, decision 7).
    console.warn("Actos API /tags fetch failed while building sitemap:", error);
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
  } catch (error) {
    // No fabricated post routes: the sitemap just omits them until the next
    // successful build (ROADMAP.md P0-02, decision 7).
    console.warn("Actos API /feed fetch failed while building sitemap:", error);
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
