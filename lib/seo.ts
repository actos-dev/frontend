import type { Post } from "actos";
import { extractExcerpt, slugify } from "@/lib/utils";

/**
 * Returns the base site URL without trailing slash.
 * Respects ACTOS_SITE_URL environment variable.
 */
export function getSiteUrl(): string {
  const url = process.env.ACTOS_SITE_URL || "https://actos.com.tr";
  return url.replace(/\/+$/, "");
}

/**
 * Canonical URL builder for a post.
 */
export function buildPostCanonicalUrl(postId: string, title?: string | null): string {
  const siteUrl = getSiteUrl();
  const slug = slugify(title || "post");
  return `${siteUrl}/posts/${postId}/${slug}`;
}

/**
 * Canonical URL builder for an actor profile.
 */
export function buildProfileCanonicalUrl(username: string): string {
  const siteUrl = getSiteUrl();
  return `${siteUrl}/u/${encodeURIComponent(username)}`;
}

/**
 * Canonical URL builder for a tag.
 */
export function buildTagCanonicalUrl(tag: string): string {
  const siteUrl = getSiteUrl();
  return `${siteUrl}/t/${encodeURIComponent(tag.toLowerCase())}`;
}

/**
 * Schema.org DiscussionForumPosting specification.
 * https://schema.org/DiscussionForumPosting
 */
export interface DiscussionForumPostingJsonLd {
  "@context": "https://schema.org";
  "@type": "DiscussionForumPosting";
  headline: string;
  articleBody: string;
  author: {
    "@type": "Person" | "Organization";
    name: string;
    url: string;
    image?: string;
  };
  datePublished: string;
  dateModified?: string;
  url: string;
  mainEntityOfPage: {
    "@type": "WebPage";
    "@id": string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
    url: string;
    logo?: {
      "@type": "ImageObject";
      url: string;
    };
  };
  interactionStatistic: Array<{
    "@type": "InteractionCounter";
    interactionType: "https://schema.org/LikeAction" | "https://schema.org/CommentAction";
    name?: string;
    userInteractionCount: number;
  }>;
  keywords?: string[];
  image?: string[];
}

/**
 * Builds Schema.org DiscussionForumPosting structured data for a post.
 */
export function buildDiscussionForumPostingJsonLd(post: Post): DiscussionForumPostingJsonLd {
  const siteUrl = getSiteUrl();
  const canonicalUrl = buildPostCanonicalUrl(post.id, post.title);
  const excerpt = extractExcerpt(post.bodyHtml || post.body, 500);
  const authorName = post.author?.displayName || post.author?.username || "Anonim";
  const authorUrl = `${siteUrl}/u/${post.author?.username || "anon"}`;

  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: post.title || "Gönderi",
    articleBody: excerpt,
    author: {
      "@type": "Person",
      name: authorName,
      url: authorUrl,
      ...(post.author?.avatarUrl ? { image: post.author.avatarUrl } : {}),
    },
    datePublished: post.createdAt,
    dateModified: post.editedAt || post.createdAt,
    url: canonicalUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "Actos",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.png`,
      },
    },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        name: "upvoteCount",
        userInteractionCount: post.score ?? 0,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        name: "commentCount",
        userInteractionCount: post.commentCount ?? 0,
      },
    ],
    ...(post.tags && post.tags.length > 0 ? { keywords: post.tags } : {}),
    image: [`${siteUrl}/posts/${post.id}/opengraph-image`],
  };
}
