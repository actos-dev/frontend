import type { Post } from "actos";
import { getServerClient } from "@/lib/actos";
import { getSiteUrl } from "@/lib/seo";
import { collectCursorPages, postSitemapEntries, sitemapUrlSetXml } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const client = await getServerClient();
    const posts = await collectCursorPages<Post>(
      ({ cursor, limit }) => client.feed.list({ cursor, limit, sort: "new" }),
      (itemCount) => console.warn(`Post sitemap reached its safety cap of ${itemCount} API items.`),
    );

    return new Response(sitemapUrlSetXml(postSitemapEntries(posts, getSiteUrl())), {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    console.warn("Actos API /feed cursor pagination failed while building sitemap:", error);
    return new Response("Post sitemap temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "300", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
