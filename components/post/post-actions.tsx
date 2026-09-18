"use client";

import type { Post } from "actos";
import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  Flag,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CrossPostDialog } from "@/components/post/cross-post-dialog";
import { ReportDialog } from "@/components/post/report-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { useTranslation } from "@/lib/i18n";
import { isAuthenticationProblem } from "@/lib/query/http";
import { useContentInteraction, useDeletePostMutation } from "@/lib/query/mutations";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn, slugify } from "@/lib/utils";

export interface PostActionsProps {
  post: Post;
  initialUserVote?: -1 | 0 | 1;
  initialViewerId?: string | null;
  initialSaved?: boolean;
  isAuthor?: boolean;
  className?: string;
  saveAriaLabel?: string;
}

export function PostActions({
  post,
  initialUserVote = 0,
  initialViewerId,
  initialSaved,
  isAuthor = false,
  className,
  saveAriaLabel,
}: PostActionsProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);
  const viewerId =
    status === "authenticated"
      ? (user?.id ?? initialViewerId ?? null)
      : status === "unauthenticated"
        ? null
        : (initialViewerId ?? null);
  const initialStateMatchesViewer = initialViewerId === undefined || initialViewerId === viewerId;

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
  const deletePost = useDeletePostMutation(post.id);

  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [crossPostOpen, setCrossPostOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isDeleting = deletePost.isPending;

  // Hidden when the source is itself a cross-post (depth is capped at one
  // level). The API also refuses a source that lives in a private community;
  // `ContentSummary.community` carries no visibility, so that refusal surfaces
  // from the request rather than being guessed here.
  const canCrossPost = FEATURE_COMMUNITIES && !post.isCrossPost;

  const isUserAuthor =
    isAuthor ||
    Boolean(user && (user.id === post.author?.id || user.username === post.author?.username));

  const slug = slugify(post.title || "post");
  const postHref = `/posts/${post.id}/${slug}`;

  // Optimistic Vote Handler (Plan §2.8 & §Faz 9)
  const handleVote = async (targetVote: 1 | -1) => {
    if (isVoting) return;

    if (!user && status === "unauthenticated") {
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : postHref;
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (isUserAuthor) {
      toast.error(t("postCard.own_vote_error"));
      return;
    }

    try {
      await interaction.vote(targetVote);
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : postHref;
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      } else {
        toast.error((error as { detail?: string }).detail || t("postCard.vote_failed"));
      }
    }
  };

  // Optimistic Save Handler (Plan §2.8 & §Faz 9)
  const handleSave = async () => {
    if (isSaving) return;

    if (!user && status === "unauthenticated") {
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : postHref;
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    const nextSaved = !saved;

    try {
      await interaction.save(nextSaved);
      toast.success(nextSaved ? t("postCard.saved_success") : t("postCard.unsaved_success"));
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : postHref;
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      } else {
        toast.error((error as { detail?: string }).detail || t("postCard.save_failed"));
      }
    }
  };

  // Share Handler
  const handleShare = async () => {
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${postHref}` : postHref;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: post.title || t("postCard.share_title"),
          url: fullUrl,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        toast.success(t("postCard.link_copied"));
      }
    } catch {
      toast.info(t("postCard.link_fallback", { url: fullUrl }));
    }
  };

  // Delete Handler (P0-12): author-only, confirmed via dialog, redirects to feed on success.
  const handleConfirmDelete = async () => {
    try {
      await deletePost.mutateAsync();
      setDeleteDialogOpen(false);
      toast.success(t("states.postDeleted"));
      router.push("/");
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : postHref;
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      } else {
        toast.error((error as { detail?: string }).detail || t("states.postDeleteFailed"));
      }
    }
  };

  return (
    <div
      data-testid="post-actions-bar"
      className={cn(
        "flex items-center justify-between gap-2 py-4 border-y border-border/60",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1 sm:gap-3">
        <div className="inline-flex items-center">
          <button
            type="button"
            onClick={() => handleVote(1)}
            disabled={isVoting || isUserAuthor}
            title={
              isUserAuthor
                ? t("postCard.own_vote_error")
                : userVote === 1
                  ? t("postCard.withdraw_vote")
                  : t("postCard.upvote")
            }
            aria-label={t("postCard.upvote")}
            aria-pressed={userVote === 1}
            className={`p-2 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
              isUserAuthor
                ? "opacity-50 cursor-not-allowed text-muted-foreground"
                : userVote === 1
                  ? "text-vote-up font-bold cursor-pointer"
                  : "text-muted-foreground hover:text-foreground cursor-pointer"
            }`}
          >
            <ArrowBigUp className="w-5 h-5" />
          </button>

          <span
            data-testid="post-score"
            className={`px-1 font-mono text-sm font-semibold tabular-nums select-none ${
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
            disabled={isVoting || isUserAuthor}
            title={
              isUserAuthor
                ? t("postCard.own_vote_error")
                : userVote === -1
                  ? t("postCard.withdraw_vote")
                  : t("postCard.downvote")
            }
            aria-label={t("postCard.downvote")}
            aria-pressed={userVote === -1}
            className={`p-2 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
              isUserAuthor
                ? "opacity-50 cursor-not-allowed text-muted-foreground"
                : userVote === -1
                  ? "text-vote-down font-bold cursor-pointer"
                  : "text-muted-foreground hover:text-foreground cursor-pointer"
            }`}
          >
            <ArrowBigDown className="w-5 h-5" />
          </button>
        </div>

        <Link
          href={`${postHref}#comments`}
          className="inline-flex min-h-10 items-center gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className="h-4 w-4" />
          <span>{post.commentCount ?? 0}</span>
          <span className="hidden sm:inline">{t("postCard.comments_short")}</span>
        </Link>
      </div>

      {/* Sağ Grup: Kaydet, Paylaş, Rapor Et ve Düzenle */}
      <div className="flex items-center gap-1.5">
        {/* Kaydet Butonu */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          title={saved ? t("postCard.remove_saved") : (saveAriaLabel ?? t("postCard.save_post"))}
          aria-label={saved ? t("postCard.remove_saved") : (saveAriaLabel ?? t("common.save"))}
          aria-pressed={saved}
          className={`min-h-10 gap-1.5 ${saved ? "text-accent-text" : ""}`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
          <span className="text-xs hidden sm:inline">
            {saved ? t("common.saved") : t("common.save")}
          </span>
        </Button>

        {/* Paylaş Butonu */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleShare}
          aria-label={t("postCard.share")}
          className="min-h-10 gap-1.5"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">{t("postCard.share")}</span>
        </Button>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t("postCard.more_actions")}
              className="min-h-10"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1">
            {isUserAuthor ? (
              <Link
                href={`/posts/${post.id}/edit`}
                data-testid="post-edit-button"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-bg-subtle"
              >
                <Pencil className="h-4 w-4" /> {t("common.edit")}
              </Link>
            ) : null}
            {canCrossPost ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setCrossPostOpen(true);
                }}
                data-testid="post-cross-post-button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-bg-subtle"
              >
                <Repeat2 className="h-4 w-4" /> {t("editor.cross_post_action")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setReportOpen(true);
              }}
              data-testid="post-report-button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-bg-subtle"
            >
              <Flag className="h-4 w-4" /> {t("common.report")}
            </button>
            {isUserAuthor ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteDialogOpen(true);
                }}
                data-testid="post-delete-button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-bg-subtle"
              >
                <Trash2 className="h-4 w-4" /> {t("common.delete")}
              </button>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>

      {/* Şikayet Modalı */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetId={post.id}
        targetType="content"
      />

      {canCrossPost ? (
        <CrossPostDialog post={post} open={crossPostOpen} onOpenChange={setCrossPostOpen} />
      ) : null}

      {/* Silme Onay Diyalogu (P0-12): comment delete flow'un aynısı — kopya ve onay deseni */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("states.postDeleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("states.postDeleteConfirmDesc", { title: post.title || "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isDeleting}>
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              data-testid="confirm-delete-post-button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("states.postDeleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
