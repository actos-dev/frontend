"use client";

import type { Post } from "actos";
import Link from "next/link";
import { CrossPostCard } from "@/components/post/cross-post-card";
import { UnavailablePost } from "@/components/post/unavailable-post";
import { CodeBlockEnhancer } from "@/components/render/code-block-enhancer";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface PostContentProps {
  post: Post;
  /**
   * Already rendered by `renderContent` (lib/render), one level up — this
   * component never touches Markdown itself, so it can stay a plain,
   * synchronous component regardless of what renders it.
   */
  bodyHtml: string;
  className?: string;
}

export function PostContent({ post, bodyHtml, className }: PostContentProps) {
  const { t } = useTranslation();

  const tagsNav =
    post.tags && post.tags.length > 0 ? (
      <nav className="flex flex-wrap gap-x-3 gap-y-2 pt-2" aria-label={t("tags.nav_label")}>
        {post.tags.map((tag) => (
          <Link
            key={tag}
            href={`/t/${tag}`}
            className="font-mono text-xs text-accent-text hover:underline underline-offset-4"
          >
            #{tag}
          </Link>
        ))}
      </nav>
    ) : null;

  // A cross-post carries no title or body of its own: it references a source
  // resolved at read time (COMMUNITY_PLAN.md §8). An unreachable source is the
  // same tombstone whether it was deleted or is behind a private door.
  if (post.isCrossPost) {
    return (
      <article data-testid="post-content" className={cn("space-y-6", className)}>
        {post.crossPost ? (
          <CrossPostCard crossPost={post.crossPost} />
        ) : (
          <UnavailablePost
            testId="cross-post-tombstone"
            title={t("crossPost.unavailable_title")}
            description={t("crossPost.unavailable_description")}
          />
        )}
        {tagsNav}
      </article>
    );
  }

  return (
    <article data-testid="post-content" className={cn("space-y-6", className)}>
      {/* 1. Editorial title (Newsreader, ~68ch measure) */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground font-serif leading-[1.2] selection:bg-primary/20">
        {post.title || t("postCard.untitled")}
      </h1>

      {/* 2. Post body: rendered by lib/render, already sanitized there. */}
      <div className="pt-2">
        <CodeBlockEnhancer>
          <div
            data-testid="post-body"
            className="prose selection:bg-primary/10"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered and sanitized by Markstone, not raw API HTML
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </CodeBlockEnhancer>
      </div>

      {tagsNav}
    </article>
  );
}
