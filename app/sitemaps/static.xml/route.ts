import { getSiteUrl } from "@/lib/seo";
import { sitemapUrlSetXml, staticSitemapEntries } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(sitemapUrlSetXml(staticSitemapEntries(getSiteUrl())), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
