import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

/**
 * Robots.txt configuration for Actos.
 *
 * Search engines are welcome. AI training/scraping crawlers are disallowed:
 * the product decision (LEGAL.md, ROADMAP D-13) is to keep that option closed
 * for now. `robots.txt` is advisory — the authoritative enforcement is
 * Cloudflare's AI Crawl Control, which must also be set to block; the two
 * layers are intentional (see the note in legal/README.md).
 */
const AI_CRAWLERS = [
  // OpenAI
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  // Google / Apple extended training signals
  "Google-Extended",
  "Applebot-Extended",
  // Common Crawl and other bulk/derived corpora
  "CCBot",
  "Bytespider",
  "PerplexityBot",
  "Amazonbot",
  "FacebookBot",
  "meta-externalagent",
  "cohere-ai",
  "Diffbot",
  "ImagesiftBot",
  "YouBot",
  "DuckAssistBot",
  "PetalBot",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
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
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
