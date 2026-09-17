import type { Tag } from "actos";
import { getServerClient } from "@/lib/actos";
import { getSiteUrl } from "@/lib/seo";
import { collectCursorPages, sitemapUrlSetXml, tagSitemapEntries } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const client = await getServerClient();
    const tags = await collectCursorPages<Tag>(
      ({ cursor, limit }) => client.tags.popular({ cursor, limit }),
      (itemCount) => console.warn(`Tag sitemap reached its safety cap of ${itemCount} API items.`),
    );

    return new Response(sitemapUrlSetXml(tagSitemapEntries(tags, getSiteUrl())), {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    console.warn("Actos API /tags cursor pagination failed while building sitemap:", error);
    return new Response("Tag sitemap temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "300", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
