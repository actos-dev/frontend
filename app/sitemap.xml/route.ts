import { getSiteUrl } from "@/lib/seo";
import { sitemapIndexXml } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const siteUrl = getSiteUrl();
  const xml = sitemapIndexXml([
    `${siteUrl}/sitemaps/static.xml`,
    `${siteUrl}/sitemaps/posts.xml`,
    `${siteUrl}/sitemaps/tags.xml`,
  ]);

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
