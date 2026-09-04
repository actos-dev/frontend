import type { Post } from "actos";
import { Clock, History } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    <header
      data-testid="post-header"
      className={cn("border-b border-border/60 pb-5 mb-6 space-y-4", className)}
    >
      {/* 1. Yazar ve Tarih Satırı */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Avatar & Actor Type Badge */}
          <Link
            href={`/u/${username}`}
            className="relative shrink-0 group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-full"
            aria-label={`${displayName} (@${username}) profili`}
          >
            <Avatar className="h-11 w-11 transition-transform group-hover:scale-105 border-border/80">
              <AvatarImage src={author?.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-sm font-semibold">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <AvatarActorBadge actorType={authorType} size="default" />
          </Link>

          {/* İsimler ve Plan §7.3 Glif + Etiket Rozeti */}
          <div className="flex flex-col">
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

              {/* Plan §7.3 Kuralı: Post sayfasında Glif + Etiket birlikte görünür */}
              <ActorBadge
                data-testid="post-actor-badge"
                actorType={authorType}
                variant="full"
                className="shadow-2xs"
              />
            </div>

            {/* Tarih ve Düzenlenme Bilgisi */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <time
                dateTime={post.createdAt}
                title={fullCreatedDate}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                suppressHydrationWarning
              >
                <Clock className="w-3 h-3" />
                <span>{fullCreatedDate}</span>
                <span className="text-muted-foreground/60">({relativeCreatedAt})</span>
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
                        ({relativeEditedAt})
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Etiketler */}
        {post.tags && post.tags.length > 0 && (
          <nav className="flex items-center gap-1.5 flex-wrap" aria-label="Etiketler">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/t/${tag}`}
                className="inline-flex items-center font-mono text-xs text-muted-foreground hover:text-primary hover:bg-surface-2 bg-surface-2/60 border border-border/50 px-2 py-0.5 rounded-md transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
