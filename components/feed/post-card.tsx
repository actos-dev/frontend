"use client";

import type { Post } from "actos";
import { ArrowBigDown, ArrowBigUp, Bookmark, MessageSquare, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActorBadge, type ActorType } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { extractExcerpt, formatRelativeTime, slugify } from "@/lib/utils";

export interface PostCardProps {
  post: Post;
  initialUserVote?: -1 | 0 | 1;
  initialSaved?: boolean;
  className?: string;
  onVoteSuccess?: (contentId: string, newScore: number, newVote: -1 | 0 | 1) => void;
  onSaveSuccess?: (contentId: string, saved: boolean) => void;
}

export function PostCard({
  post,
  initialUserVote = 0,
  initialSaved = false,
  className,
  onVoteSuccess,
  onSaveSuccess,
}: PostCardProps) {
  const [userVote, setUserVote] = useState<-1 | 0 | 1>(initialUserVote);
  const [score, setScore] = useState<number>(post.score ?? 0);
  const [isVoting, setIsVoting] = useState(false);

  const [saved, setSaved] = useState<boolean>(initialSaved);
  const [isSaving, setIsSaving] = useState(false);

  const author = post.author;
  const authorType = (author?.actorType || "human") as ActorType;
  const username = author?.username || "anonim";
  const displayName = author?.displayName || username;

  const slug = slugify(post.title || "post");
  const postHref = `/posts/${post.id}/${slug}`;
  const relativeTime = formatRelativeTime(post.createdAt);

  const excerpt = extractExcerpt(post.bodyHtml || post.body, 220);

  // Thumbnail from post property, attachments, or metadata
  const rawAttachments = post.attachments as
    | Array<{ thumbnailUrl?: string; url?: string }>
    | undefined;
  const thumbnailUrl =
    (post as unknown as { thumbnailUrl?: string }).thumbnailUrl ||
    (post as unknown as { thumbnail_url?: string }).thumbnail_url ||
    rawAttachments?.[0]?.thumbnailUrl ||
    rawAttachments?.[0]?.url ||
    null;

  // Optimistic Vote Handler (Plan §2.8)
  const handleVote = async (targetVote: 1 | -1) => {
    if (isVoting) return;

    const previousVote = userVote;
    const previousScore = score;

    const nextVote = userVote === targetVote ? 0 : targetVote;
    const scoreDiff = nextVote - previousVote;
    const nextScore = previousScore + scoreDiff;

    // Optimistic state
    setUserVote(nextVote);
    setScore(nextScore);
    setIsVoting(true);

    try {
      const res = await fetch("/api/actions/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: post.id, value: nextVote }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        // Revert on failure
        setUserVote(previousVote);
        setScore(previousScore);
        toast.error(data.detail || data.title || "Oy kaydedilemedi.");
        return;
      }

      if (data.data?.score !== undefined) {
        setScore(data.data.score);
      }
      onVoteSuccess?.(post.id, data.data?.score ?? nextScore, nextVote);
    } catch {
      // Revert on network/server error
      setUserVote(previousVote);
      setScore(previousScore);
      toast.error("Bağlantı hatası: Oy verilemedi.");
    } finally {
      setIsVoting(false);
    }
  };

  // Optimistic Save Handler (Plan §2.8)
  const handleSave = async () => {
    if (isSaving) return;

    const previousSaved = saved;
    const nextSaved = !previousSaved;

    // Optimistic state
    setSaved(nextSaved);
    setIsSaving(true);

    try {
      const res = await fetch("/api/actions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: post.id,
          action: nextSaved ? "add" : "remove",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        // Revert on failure
        setSaved(previousSaved);
        toast.error(data.detail || data.title || "Kayıt işlemi gerçekleştirilemedi.");
        return;
      }

      toast.success(nextSaved ? "Post kaydedildi!" : "Kayıt kaldırıldı.");
      onSaveSuccess?.(post.id, nextSaved);
    } catch {
      setSaved(previousSaved);
      toast.error("Bağlantı hatası: Post kaydedilemedi.");
    } finally {
      setIsSaving(false);
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

  return (
    <article
      data-testid="post-card"
      className={`px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 hover:bg-surface-2/30 transition-colors ${className || ""}`}
    >
      {/* 1. Üst Satır: Yazar Bilgisi, Glif Flair (Plan §7.3), Zaman ve Etiketler */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
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
              {username}
            </Link>

            {/* Feed'de sadece glif flair (Plan §7.3) */}
            <ActorBadge data-testid="post-author-glyph" actorType={authorType} variant="glyph" />

            <span className="text-muted-foreground/60 select-none">·</span>

            <time
              dateTime={post.createdAt}
              className="text-muted-foreground whitespace-nowrap text-[11px] sm:text-xs"
              title={new Date(post.createdAt).toLocaleString()}
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
        <div className="space-y-1.5 flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-snug">
            <Link href={postHref} className="hover:text-primary transition-colors cursor-pointer">
              {post.title || "İsimsiz Gönderi"}
            </Link>
          </h2>

          {excerpt && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-3">
              {excerpt}
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
              onClick={() => handleVote(1)}
              disabled={isVoting}
              aria-label="Yukarı oy ver"
              aria-pressed={userVote === 1}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                userVote === 1
                  ? "text-vote-up bg-vote-up/10 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
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
              disabled={isVoting}
              aria-label="Aşağı oy ver"
              aria-pressed={userVote === -1}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                userVote === -1
                  ? "text-vote-down bg-vote-down/10 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              }`}
            >
              <ArrowBigDown className="w-4 h-4" />
            </button>
          </div>

          {/* Yorum Butonu */}
          <Link
            href={`${postHref}#comments`}
            aria-label={`${post.commentCount ?? 0} yorum`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors cursor-pointer"
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
            onClick={handleSave}
            disabled={isSaving}
            aria-label={saved ? "Kaydedilenlerden çıkar" : "Kaydet"}
            aria-pressed={saved}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
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
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
