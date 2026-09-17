"use client";

import type { Post } from "actos";
import { ArrowBigDown, ArrowBigUp, Bookmark, MessageSquare, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActorBadge, type ActorType } from "@/components/ui/badge";
import { Highlight } from "@/components/ui/highlight";
import { toast } from "@/components/ui/toast";
import { isAuthenticationProblem } from "@/lib/query/http";
import { useContentInteraction } from "@/lib/query/mutations";
import { excerpt } from "@/lib/render/excerpt";
import { type SessionUser, useSessionStore } from "@/lib/stores/session-store";
import { cn, formatRelativeTime, slugify } from "@/lib/utils";

export interface PostCardProps {
  post: Post;
  initialUserVote?: -1 | 0 | 1;
  initialViewerId?: string | null;
  initialSaved?: boolean;
  currentUser?: SessionUser | null;
  className?: string;
  highlightQuery?: string;
  saveAriaLabel?: string;
  onVoteSuccess?: (contentId: string, newScore: number, newVote: -1 | 0 | 1) => void;
  onSaveSuccess?: (contentId: string, saved: boolean) => void;
}

export function PostCard({
  post,
  initialUserVote = 0,
  initialViewerId,
  initialSaved,
  currentUser,
  className,
  highlightQuery,
  saveAriaLabel,
  onVoteSuccess,
  onSaveSuccess,
}: PostCardProps) {
  const router = useRouter();
  const storeUser = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);
  const viewerId =
    status === "authenticated"
      ? (storeUser?.id ?? initialViewerId ?? null)
      : status === "unauthenticated"
        ? null
        : (initialViewerId ?? null);
  const initialStateMatchesViewer = initialViewerId === undefined || initialViewerId === viewerId;
  const user = currentUser !== undefined ? currentUser : storeUser;

  const interaction = useContentInteraction(
    post.id,
    {
      score: post.score ?? 0,
      userVote: initialStateMatchesViewer ? initialUserVote : 0,
      saved: initialStateMatchesViewer ? initialSaved : undefined,
    },
    viewerId,
  );
  const { userVote, score, isVoting, isSaving } = interaction;
  const saved = interaction.saved ?? false;

  const author = post.author;
  const authorType = (author?.actorType || "human") as ActorType;
  const username = author?.username || "anonim";
  const displayName = author?.displayName || username;

  // Kendi içeriğine oy verilemez kontrolü (Plan §Faz 9)
  const isAuthor = Boolean(user && (user.id === author?.id || user.username === author?.username));

  const slug = slugify(post.title || "post");
  const postHref = `/posts/${post.id}/${slug}`;
  const relativeTime = formatRelativeTime(post.createdAt);

  const bodyExcerpt = excerpt(post.body, 220);

  const thumbnailUrl = post.attachments?.[0]?.thumbnailUrl || post.attachments?.[0]?.url || null;

  // Optimistic Vote Handler (Plan §2.8 & §Faz 9)
  const handleVote = async (targetVote: 1 | -1) => {
    if (isVoting) return;

    // Giriş yapmamış kullanıcı tıkladığında giriş sayfasına yönlendirilir
    if (!user && status === "unauthenticated") {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (isAuthor) {
      toast.error("Kendi içeriğinize oy veremezsiniz.");
      return;
    }

    const nextVote = userVote === targetVote ? 0 : targetVote;

    try {
      const result = await interaction.vote(targetVote);
      onVoteSuccess?.(post.id, result.score ?? score + nextVote - userVote, nextVote);
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      } else {
        toast.error((error as { detail?: string }).detail || "Oy kaydedilemedi.");
      }
    }
  };

  // Optimistic Save Handler (Plan §2.8 & §Faz 9)
  const handleSave = async () => {
    if (isSaving) return;

    if (!user && status === "unauthenticated") {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    const nextSaved = !saved;

    try {
      await interaction.save(nextSaved);
      toast.success(nextSaved ? "Post kaydedildi!" : "Kayıt kaldırıldı.");
      onSaveSuccess?.(post.id, nextSaved);
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        const currentPath =
          typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      } else {
        toast.error((error as { detail?: string }).detail || "Kayıt işlemi gerçekleştirilemedi.");
      }
    }
  };

  // Share Handler
  const handleShare = async () => {
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${postHref}` : postHref;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      }
      toast.success("Post bağlantısı panoya kopyalandı!");
    } catch {
      toast.info(`Bağlantı: ${fullUrl}`);
    }
  };

  // Card click handler: card boş alanlarına tıklandığında post detayına yönlendirir
  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, [role='button'], input, textarea, select")) {
      return;
    }
    router.push(postHref);
  };

  // Keyboard navigation handler for card container
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, [role='button'], input, textarea, select")) {
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
      }
      router.push(postHref);
    }
  };

  return (
    <article
      data-testid="post-card"
      data-post-id={post.id}
      data-post-href={postHref}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 hover:bg-surface-2/30 transition-colors cursor-pointer",
        className,
      )}
    >
      {/* 1. Top row: author info, glyph flair (Plan §7.3), timestamp, and tags */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Link
            href={`/u/${username}`}
            className="relative shrink-0 group"
            aria-label={`${displayName} profili`}
          >
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8 transition-transform group-hover:scale-105">
              <AvatarImage src={author?.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-[10px] sm:text-xs">
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

            {/* Feed'de sadece glif flair (Plan §7.3) */}
            <ActorBadge data-testid="post-author-glyph" actorType={authorType} variant="glyph" />

            <span className="text-muted-foreground/60 select-none">·</span>

            <time
              dateTime={post.createdAt}
              className="text-muted-foreground whitespace-nowrap text-[11px] sm:text-xs"
              title={post.createdAt}
              suppressHydrationWarning
            >
              {relativeTime}
            </time>
          </div>
        </div>

        {/* Etiketler (Plan §4.1: Başlığın sağında / üst köşede) */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                href={`/t/${tag}`}
                className="inline-flex items-center font-mono text-[11px] text-muted-foreground hover:text-primary hover:bg-surface-2 px-1.5 py-0.5 rounded transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 2. Orta Gövde: Başlık, Gövde Özeti ve Opsiyonel Küçük Resim */}
      <div className="flex items-start justify-between gap-4 my-1.5">
        <div className="space-y-2 flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-normal">
            <Link
              data-testid="post-title-link"
              href={postHref}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              <Highlight text={post.title || "İsimsiz Gönderi"} query={highlightQuery} />
            </Link>
          </h2>

          {bodyExcerpt && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-normal line-clamp-2 sm:line-clamp-3">
              <Highlight text={bodyExcerpt} query={highlightQuery} />
            </p>
          )}
        </div>

        {thumbnailUrl && (
          <Link
            href={postHref}
            className="shrink-0 group overflow-hidden rounded-xl border border-border/70 bg-surface-2"
          >
            {/* biome-ignore lint/performance/noImgElement: user upload thumbnail */}
            <img
              src={thumbnailUrl}
              alt=""
              className="w-18 h-18 sm:w-22 sm:h-22 object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          </Link>
        )}
      </div>

      {/* 3. Aksiyon Satırı: Oy Grubu, Yorumlar, Kaydet, Paylaş */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 mt-1">
        <div className="flex items-center gap-1.5">
          {/* Oy Grubu: Yukarı Oy / Aşağı Oy (Plan §5.1 --vote-up, --vote-down) */}
          <div className="inline-flex items-center rounded-lg bg-surface-2/80 border border-border/80 p-0.5 shadow-2xs">
            <button
              type="button"
              data-testid="post-vote-up"
              onClick={() => handleVote(1)}
              disabled={isVoting || isAuthor}
              title={
                isAuthor
                  ? "Kendi içeriğinize oy veremezsiniz"
                  : userVote === 1
                    ? "Oyu geri çek"
                    : "Yukarı oy ver"
              }
              aria-label="Yukarı oy ver"
              aria-pressed={userVote === 1}
              className={`p-1 rounded-md transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${
                isAuthor
                  ? "opacity-50 cursor-not-allowed text-muted-foreground"
                  : userVote === 1
                    ? "text-vote-up bg-vote-up/10 font-bold cursor-pointer"
                    : "text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
              }`}
            >
              <ArrowBigUp className="w-4 h-4" />
            </button>

            <span
              className={`px-1.5 font-semibold text-[11px] sm:text-xs font-mono select-none ${
                userVote === 1
                  ? "text-vote-up"
                  : userVote === -1
                    ? "text-vote-down"
                    : "text-foreground"
              }`}
            >
              {score}
            </span>

            <button
              type="button"
              onClick={() => handleVote(-1)}
              disabled={isVoting || isAuthor}
              title={
                isAuthor
                  ? "Kendi içeriğinize oy veremezsiniz"
                  : userVote === -1
                    ? "Oyu geri çek"
                    : "Aşağı oy ver"
              }
              aria-label="Aşağı oy ver"
              aria-pressed={userVote === -1}
              className={`p-1 rounded-md transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${
                isAuthor
                  ? "opacity-50 cursor-not-allowed text-muted-foreground"
                  : userVote === -1
                    ? "text-vote-down bg-vote-down/10 font-bold cursor-pointer"
                    : "text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
              }`}
            >
              <ArrowBigDown className="w-4 h-4" />
            </button>
          </div>

          {/* Yorum Butonu */}
          <Link
            href={`${postHref}#comments`}
            aria-label={`${post.commentCount ?? 0} yorum`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[11px] sm:text-xs font-mono font-medium">
              {post.commentCount ?? 0}
            </span>
          </Link>
        </div>

        {/* Sağ Aksiyonlar: Kaydet ve Paylaş */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="post-save-btn"
            onClick={handleSave}
            disabled={isSaving}
            title={saved ? "Kaydedilenlerden çıkar" : (saveAriaLabel ?? "Gönderiyi kaydet")}
            aria-label={saved ? "Kaydedilenlerden çıkar" : (saveAriaLabel ?? "Kaydet")}
            aria-pressed={saved}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${
              saved
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Paylaş"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
