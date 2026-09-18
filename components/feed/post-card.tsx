"use client";

import type { Post } from "actos";
import { ArrowDown, ArrowUp, Bookmark, MessageSquare, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActorHoverCard } from "@/components/actor/actor-hover-card";
import { PostRowMenu } from "@/components/feed/post-row-menu";
import { CrossPostCard } from "@/components/post/cross-post-card";
import { UnavailablePost } from "@/components/post/unavailable-post";
import { ActorAvatar } from "@/components/ui/avatar";
import { ActorBadge, type ActorType } from "@/components/ui/badge";
import { Highlight } from "@/components/ui/highlight";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
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
  density?: "card" | "compact";
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
  density = "card",
  onVoteSuccess,
  onSaveSuccess,
}: PostCardProps) {
  const router = useRouter();
  const { locale, t } = useTranslation();
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
  const username = author?.username || t("postCard.anonymous");
  const displayName = author?.displayName || username;
  const isAuthor = Boolean(user && (user.id === author?.id || user.username === author?.username));
  const postHref = `/posts/${post.id}/${slugify(post.title || "post")}`;
  const relativeTime = formatRelativeTime(post.createdAt, locale);
  const bodyExcerpt = excerpt(post.body, 220);
  // Feed list DTOs currently omit attachments. Only render a thumbnail when the
  // list item itself includes one; do not fetch post details per row.
  const thumbnailUrl = post.attachments?.[0]?.thumbnailUrl || post.attachments?.[0]?.url || null;
  const isCompact = density === "compact";

  const loginForCurrentPage = () => {
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
  };

  const handleVote = async (targetVote: 1 | -1) => {
    if (isVoting) return;
    if (!user && status === "unauthenticated") {
      loginForCurrentPage();
      return;
    }
    if (isAuthor) {
      toast.error(t("postCard.own_vote_error"));
      return;
    }

    const nextVote = userVote === targetVote ? 0 : targetVote;
    try {
      const result = await interaction.vote(targetVote);
      onVoteSuccess?.(post.id, result.score ?? score + nextVote - userVote, nextVote);
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        loginForCurrentPage();
      } else {
        toast.error((error as { detail?: string }).detail || t("postCard.vote_failed"));
      }
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!user && status === "unauthenticated") {
      loginForCurrentPage();
      return;
    }

    const nextSaved = !saved;
    try {
      await interaction.save(nextSaved);
      toast.success(nextSaved ? t("postCard.saved_success") : t("postCard.unsaved_success"));
      onSaveSuccess?.(post.id, nextSaved);
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        loginForCurrentPage();
      } else {
        toast.error((error as { detail?: string }).detail || t("postCard.save_failed"));
      }
    }
  };

  const handleShare = async () => {
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${postHref}` : postHref;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      }
      toast.success(t("postCard.link_copied"));
    } catch {
      toast.info(t("postCard.link_fallback", { url: fullUrl }));
    }
  };

  const voteButtonClass = (active: boolean, direction: "up" | "down") =>
    cn(
      "inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background sm:min-h-7 sm:min-w-7",
      direction === "up" && active && "text-vote-up",
      direction === "down" && active && "text-vote-down",
      isAuthor && "cursor-not-allowed opacity-50",
    );

  return (
    <article
      data-testid="post-card"
      data-post-id={post.id}
      data-post-href={postHref}
      data-density={density}
      className={cn(
        "group relative grid grid-cols-[36px_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-border px-3 py-3 transition-colors hover:bg-bg-subtle/60 sm:gap-x-4 sm:px-4 sm:py-3.5",
        isCompact &&
          "min-h-14 grid-cols-[76px_minmax(0,1fr)_auto] gap-x-2 px-2.5 py-2 sm:gap-x-3 sm:px-3 sm:py-2.5",
        className,
      )}
    >
      <fieldset
        className={cn(
          "relative z-10 col-start-1 row-span-2 flex flex-col items-center pt-0.5 text-fg-subtle",
          isCompact && "row-span-1 flex-row gap-0 self-center pt-0",
        )}
      >
        <legend className="sr-only">{t("postCard.score", { score })}</legend>
        <button
          type="button"
          data-testid="post-vote-up"
          onClick={() => handleVote(1)}
          disabled={isVoting || isAuthor}
          title={
            isAuthor
              ? t("postCard.own_vote_error")
              : userVote === 1
                ? t("postCard.withdraw_vote")
                : t("postCard.upvote")
          }
          aria-label={t("postCard.upvote")}
          aria-pressed={userVote === 1}
          className={voteButtonClass(userVote === 1, "up")}
        >
          <ArrowUp aria-hidden="true" className="h-4 w-4" />
        </button>
        <span
          className={cn(
            "min-w-6 text-center font-mono text-[11px] font-medium tabular-nums text-fg",
            userVote === 1 && "text-vote-up",
            userVote === -1 && "text-vote-down",
          )}
          aria-live="polite"
        >
          {score}
        </span>
        <button
          type="button"
          onClick={() => handleVote(-1)}
          disabled={isVoting || isAuthor}
          title={
            isAuthor
              ? t("postCard.own_vote_error")
              : userVote === -1
                ? t("postCard.withdraw_vote")
                : t("postCard.downvote")
          }
          aria-label={t("postCard.downvote")}
          aria-pressed={userVote === -1}
          className={cn(voteButtonClass(userVote === -1, "down"), isCompact && "min-h-8 min-w-7")}
        >
          <ArrowDown aria-hidden="true" className="h-4 w-4" />
        </button>
      </fieldset>

      <div
        className={cn(
          "col-start-2 row-span-2 min-w-0",
          isCompact && "row-span-1 flex flex-wrap items-center gap-x-2 gap-y-0.5",
        )}
      >
        <div
          className={cn(
            "mb-1 flex min-h-7 min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-tight text-fg-muted",
            isCompact && "order-2 mb-0 min-h-5 gap-x-1 text-[10px]",
          )}
        >
          {post.community ? (
            <>
              <Link
                href={`/c/${post.community.name}`}
                data-testid="post-community-link"
                className="relative z-10 shrink-0 font-mono text-[10px] font-medium text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                c/{post.community.name}
              </Link>
              <span aria-hidden="true" className="text-fg-subtle">
                ·
              </span>
            </>
          ) : null}
          <ActorHoverCard username={username} className="min-w-0 items-center gap-1.5">
            <Link
              href={`/u/${username}`}
              className="relative z-10 inline-flex min-h-7 min-w-0 items-center gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
              aria-label={t("postCard.profile", { name: displayName })}
            >
              <ActorAvatar
                actorType={authorType}
                username={username}
                displayName={displayName}
                src={author?.avatarUrl}
                size={isCompact ? 20 : 28}
              />
              <span className="max-w-32 truncate font-medium text-fg hover:text-accent-text">
                <Highlight text={displayName} query={highlightQuery} />
              </span>
            </Link>
            <ActorBadge data-testid="post-author-glyph" actorType={authorType} />
            <Link
              href={`/u/${username}`}
              className="relative z-10 truncate font-mono text-[10px] text-fg-subtle hover:text-fg"
            >
              @<Highlight text={username} query={highlightQuery} />
            </Link>
          </ActorHoverCard>
          <span aria-hidden="true" className="text-fg-subtle">
            ·
          </span>
          <time
            dateTime={post.createdAt}
            className="whitespace-nowrap text-[10px] text-fg-subtle"
            title={post.createdAt}
            suppressHydrationWarning
          >
            {relativeTime}
          </time>
        </div>

        {post.isCrossPost ? (
          post.crossPost ? (
            <CrossPostCard crossPost={post.crossPost} />
          ) : (
            <UnavailablePost
              testId="cross-post-tombstone"
              className="my-1 border-0 px-0 py-1"
              title={t("crossPost.unavailable_title")}
              description={t("crossPost.unavailable_description")}
            />
          )
        ) : (
          <>
            <h2
              className={cn(
                "my-0.5 font-serif text-[17px] font-medium leading-[1.18] tracking-tight text-fg sm:text-[19px]",
                isCompact && "order-1 my-0 inline text-[15px] leading-tight sm:text-base",
              )}
            >
              <Link
                data-testid="post-title-link"
                href={postHref}
                className="rounded-sm before:absolute before:inset-0 before:z-0 hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
              >
                <Highlight text={post.title || t("postCard.untitled")} query={highlightQuery} />
              </Link>
            </h2>

            {bodyExcerpt && (
              <p
                className={cn(
                  "mt-1 line-clamp-2 text-xs leading-snug text-fg-muted",
                  isCompact && "hidden",
                )}
              >
                <Highlight text={bodyExcerpt} query={highlightQuery} />
              </p>
            )}
          </>
        )}

        <div
          className={cn(
            "mt-2 flex min-h-8 flex-wrap items-center gap-x-3 text-[11px] text-fg-subtle",
            isCompact && "hidden",
          )}
        >
          <Link
            href={`${postHref}#comments`}
            aria-label={t("postCard.comment_count", { count: post.commentCount ?? 0 })}
            className="relative z-10 inline-flex min-h-8 items-center gap-1.5 rounded-sm hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
          >
            <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="font-mono tabular-nums">{post.commentCount ?? 0}</span>
          </Link>
          <button
            type="button"
            data-testid="post-save-btn"
            onClick={handleSave}
            disabled={isSaving}
            title={saved ? t("postCard.remove_saved") : (saveAriaLabel ?? t("postCard.save_post"))}
            aria-label={saved ? t("postCard.remove_saved") : (saveAriaLabel ?? t("common.save"))}
            aria-pressed={saved}
            className={cn(
              "relative z-10 inline-flex min-h-8 items-center gap-1.5 rounded-sm hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background",
              saved && "text-accent-text",
            )}
          >
            <Bookmark aria-hidden="true" className={cn("h-3.5 w-3.5", saved && "fill-current")} />
            <span className="sr-only sm:not-sr-only">
              {saved ? t("common.saved") : t("common.save")}
            </span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label={t("postCard.share")}
            className="relative z-10 inline-flex min-h-8 items-center gap-1.5 rounded-sm hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background"
          >
            <Share2 aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">{t("postCard.share")}</span>
          </button>
          <PostRowMenu post={post} isAuthor={isAuthor} />
          {post.tags && post.tags.length > 0 && (
            <div
              className={cn(
                "ml-auto flex min-w-0 flex-wrap items-center gap-x-2",
                isCompact && "hidden",
              )}
            >
              {post.tags.slice(0, 2).map((tag) => (
                <Link
                  key={tag}
                  href={`/t/${tag}`}
                  className="relative z-10 max-w-28 truncate font-mono text-[10px] text-fg-muted hover:text-accent-text"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {thumbnailUrl && !isCompact && (
        <Link
          href={postHref}
          aria-label={t("postCard.open_post", { title: post.title || t("postCard.untitled") })}
          className="relative z-10 col-start-3 row-span-2 mt-1 hidden h-[54px] w-[70px] overflow-hidden border border-border bg-bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block"
        >
          <Image
            src={thumbnailUrl}
            alt=""
            width={70}
            height={54}
            className="h-full w-full object-cover"
          />
        </Link>
      )}
    </article>
  );
}
