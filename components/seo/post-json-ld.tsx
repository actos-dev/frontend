import type { Post } from "actos";
import { buildDiscussionForumPostingJsonLd } from "@/lib/seo";

export interface PostJsonLdProps {
  post: Post;
}

/**
 * Renders Schema.org DiscussionForumPosting JSON-LD script for search engines.
 * Plan §Faz 16 Gereksinim 4.
 */
export function PostJsonLd({ post }: PostJsonLdProps) {
  const jsonLd = buildDiscussionForumPostingJsonLd(post);

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data required by search engines
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
