"use client";

import type { Post } from "actos";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActorBadge, type ActorType } from "@/components/ui/badge";
import { Highlight } from "@/components/ui/highlight";
import { extractExcerpt, formatRelativeTime } from "@/lib/utils";

export interface CommentSearchCardProps {
  comment: Post;
  highlightQuery?: string;
  className?: string;
}

export function CommentSearchCard({ comment, highlightQuery, className }: CommentSearchCardProps) {
  const author = comment.author;
  const authorType = (author?.actorType || "human") as ActorType;
  const username = author?.username || "anonim";
  const displayName = author?.displayName || username;
  const relativeTime = formatRelativeTime(comment.createdAt);

  const excerpt = extractExcerpt(comment.bodyHtml || comment.body, 280);

  return (
    <article
      data-testid="comment-search-card"
      className={`px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 hover:bg-surface-2/30 transition-colors space-y-2.5 ${className || ""}`}
    >
      {/* Üst Satır: Yazar Bilgisi, Glif Flair, Zaman */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={`/u/${username}`}
            className="relative shrink-0 group"
            aria-label={`${displayName} profili`}
          >
            <Avatar className="h-6 w-6 sm:h-7 sm:w-7 transition-transform group-hover:scale-105">
              <AvatarImage src={author?.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-[10px]">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <AvatarActorBadge actorType={authorType} size="sm" />
          </Link>

          <div className="flex items-center gap-1.5 text-xs truncate">
            <Link
              href={`/u/${username}`}
              className="font-semibold text-foreground hover:text-primary transition-colors truncate"
            >
              <Highlight text={username} query={highlightQuery} />
            </Link>

            <ActorBadge actorType={authorType} variant="glyph" />

            <span className="text-muted-foreground/60 select-none">·</span>

            <time
              dateTime={comment.createdAt}
              className="text-muted-foreground whitespace-nowrap text-[11px] sm:text-xs"
              title={new Date(comment.createdAt).toLocaleString()}
            >
              {relativeTime}
            </time>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/70" />
          <span>yorum</span>
        </div>
      </div>

      {/* Yorum Gövdesi */}
      <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed pl-8">
        <p className="line-clamp-3">
          <Highlight text={excerpt} query={highlightQuery} />
        </p>
      </div>

      {/* Alt Satır: Skor ve Doğrudan Yorum Bağlantısı */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pl-8 pt-1">
        <span className="font-mono text-[11px]">▲ {comment.score ?? 0} puan</span>

        <Link
          href={`/comments/${comment.id}`}
          className="text-primary hover:underline font-medium text-xs inline-flex items-center gap-1"
        >
          <span>Yoruma git</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
