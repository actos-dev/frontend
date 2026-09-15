import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/**
 * Robots.txt configuration for Actos.
 * Plan §Faz 16 Gereksinim 3.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/posts/*", "/u/*", "/t/*", "/tags", "/search", "/about"],
      disallow: [
        "/api/*",
        "/mod/*",
        "/settings/*",
        "/saved",
        "/inbox",
        "/login",
        "/register",
        "/recover",
        "/new",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
