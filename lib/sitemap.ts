import type { Page, Post, Tag } from "actos";
import type { MetadataRoute } from "next";
import { slugify } from "@/lib/utils";

/**
 * Each dynamic sitemap follows up to 100 cursor pages of 100 API rows (10,000
 * rows total). This bounded loop protects crawler requests from unbounded API
 * walks; raise the cap or shard the endpoint when backend totals become
 * available. The result remains below the 50,000-URL sitemap format ceiling.
 */
export const SITEMAP_PAGE_SIZE = 100;
export const SITEMAP_MAX_PAGES = 100;
export const SITEMAP_MAX_ITEMS = SITEMAP_PAGE_SIZE * SITEMAP_MAX_PAGES;

const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";

export const STATIC_SITEMAP_PATHS = ["/", "/about", "/tags"] as const;

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function sitemapIndexXml(locations: string[]): string {
  const entries = locations.map(
    (location) => `  <sitemap><loc>${escapeXml(location)}</loc></sitemap>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${SITEMAP_NS}">\n${entries.join("\n")}\n</sitemapindex>`;
}

export function sitemapUrlSetXml(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map((entry) => {
    const lastModified = entry.lastModified
      ? `\n    <lastmod>${escapeXml(new Date(entry.lastModified).toISOString())}</lastmod>`
      : "";
    const changeFrequency = entry.changeFrequency
      ? `\n    <changefreq>${entry.changeFrequency}</changefreq>`
      : "";
    const priority =
      typeof entry.priority === "number" ? `\n    <priority>${entry.priority}</priority>` : "";
    return `  <url>\n    <loc>${escapeXml(entry.url)}</loc>${lastModified}${changeFrequency}${priority}\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${SITEMAP_NS}">\n${urls.join("\n")}\n</urlset>`;
}

export async function collectCursorPages<T>(
  fetchPage: (params: { cursor?: string; limit: number }) => Promise<Page<T>>,
  onSafetyLimit?: (itemCount: number) => void,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  const seenCursors = new Set<string>();

  for (let pageNumber = 0; pageNumber < SITEMAP_MAX_PAGES; pageNumber += 1) {
    const page = await fetchPage({ cursor, limit: SITEMAP_PAGE_SIZE });
    items.push(...page.items.slice(0, SITEMAP_MAX_ITEMS - items.length));

    if (!page.nextCursor || items.length >= SITEMAP_MAX_ITEMS) {
      if (page.nextCursor && items.length >= SITEMAP_MAX_ITEMS) onSafetyLimit?.(items.length);
      return items;
    }

    if (seenCursors.has(page.nextCursor)) {
      throw new Error("Sitemap API cursor did not advance");
    }

    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }

  onSafetyLimit?.(items.length);
  return items;
}

export function staticSitemapEntries(siteUrl: string, now = new Date()): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
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
}

export function postSitemapEntries(posts: Post[], siteUrl: string): MetadataRoute.Sitemap {
  return posts
    .filter((post) => !post.deleted)
    .map((post) => {
      const modifiedAt = post.editedAt || post.createdAt;
      const parsedDate = new Date(modifiedAt);

      return {
        url: `${siteUrl}/posts/${encodeURIComponent(post.id)}/${slugify(post.title || "post")}`,
        ...(modifiedAt && !Number.isNaN(parsedDate.getTime()) ? { lastModified: parsedDate } : {}),
        changeFrequency: "weekly",
        priority: 0.8,
      };
    });
}

export function tagSitemapEntries(tags: Tag[], siteUrl: string): MetadataRoute.Sitemap {
  return tags.map((tag) => ({
    url: `${siteUrl}/t/${encodeURIComponent(tag.name.toLowerCase())}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));
}
