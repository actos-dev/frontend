import type { Post } from "actos";
import { History } from "lucide-react";
import Link from "next/link";
import { ActorHoverCard } from "@/components/actor/actor-hover-card";
import { ActorAvatar } from "@/components/ui/avatar";
import { ActorBadge, type ActorType } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils";

export interface PostHeaderProps {
  post: Post;
  className?: string;
}

export function PostHeader({ post, className }: PostHeaderProps) {
  const author = post.author;
  const authorType = (author?.actorType || "human") as ActorType;
  const username = author?.username || "anonim";
  const displayName = author?.displayName || username;

  const createdAtDate = new Date(post.createdAt);
  const fullCreatedDate = createdAtDate.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const relativeCreatedAt = formatRelativeTime(post.createdAt);

  const editedAtDate = post.editedAt ? new Date(post.editedAt) : null;
  const relativeEditedAt = post.editedAt ? formatRelativeTime(post.editedAt) : null;
  const fullEditedDate = editedAtDate
    ? editedAtDate.toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <header data-testid="post-header" className={cn("mb-6", className)}>
      {/* 1. Yazar ve Tarih Satırı */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
        <ActorHoverCard username={username} className="items-center gap-3">
          <Link
            href={`/u/${username}`}
            className="shrink-0 rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${displayName} (@${username}) profili`}
          >
            <ActorAvatar
              actorType={authorType}
              username={username}
              displayName={displayName}
              src={author?.avatarUrl}
              size={40}
            />
          </Link>

          {/* İsimler ve Plan §7.3 Glif + Etiket Rozeti */}
          <span className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/u/${username}`}
                className="font-bold text-foreground hover:text-primary transition-colors text-base tracking-tight"
              >
                {displayName}
              </Link>
              <Link
                href={`/u/${username}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
              >
                @{username}
              </Link>

              <ActorBadge
                data-testid="post-actor-badge"
                actorType={authorType}
                variant="full"
                className="shadow-2xs"
              />
            </div>

            {/* Community slot lands here when the backend exposes communities. */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <time
                dateTime={post.createdAt}
                title={fullCreatedDate}
                className="hover:text-foreground transition-colors"
                suppressHydrationWarning
              >
                {relativeCreatedAt}
              </time>

              {/* Düzenlenmiş İçerik Göstergesi */}
              {post.editedAt && (
                <>
                  <span className="text-muted-foreground/40 select-none">•</span>
                  <span
                    data-testid="post-edited-indicator"
                    title={fullEditedDate ? `Düzenlendi: ${fullEditedDate}` : "Düzenlendi"}
                    className="inline-flex items-center gap-1 text-primary/80 font-medium text-[11px]"
                  >
                    <History className="w-3 h-3" />
                    <span>düzenlendi</span>
                    {relativeEditedAt && (
                      <span className="text-muted-foreground/80 font-normal">
                        {relativeEditedAt}
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          </span>
        </ActorHoverCard>
      </div>
    </header>
  );
}
