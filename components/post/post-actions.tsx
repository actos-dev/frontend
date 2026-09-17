"use client";

import type { Post } from "actos";
import { ArrowBigDown, ArrowBigUp, Bookmark, Flag, Pencil, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { toast } from "@/components/ui/toast";
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isDeleting = deletePost.isPending;

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
      toast.error("Kendi içeriğinize oy veremezsiniz.");
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
        toast.error((error as { detail?: string }).detail || "Oy kaydedilemedi.");
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
      toast.success(nextSaved ? "Post kaydedildi!" : "Kayıt kaldırıldı.");
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : postHref;
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
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: post.title || "Actos Gönderisi",
          url: fullUrl,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        toast.success("Bağlantı panoya kopyalandı!");
      }
    } catch {
      toast.info(`Bağlantı: ${fullUrl}`);
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
      {/* Sol Grup: Oy Sistemi */}
      <div className="inline-flex items-center rounded-xl bg-surface-2/90 border border-border/80 p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => handleVote(1)}
          disabled={isVoting || isUserAuthor}
          title={
            isUserAuthor
              ? "Kendi içeriğinize oy veremezsiniz"
              : userVote === 1
                ? "Oyu geri çek"
                : "Yukarı oy ver"
          }
          aria-label="Yukarı oy ver"
          aria-pressed={userVote === 1}
          className={`p-1.5 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${
            isUserAuthor
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : userVote === 1
                ? "text-vote-up bg-vote-up/10 font-bold cursor-pointer"
                : "text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
          }`}
        >
          <ArrowBigUp className="w-5 h-5" />
        </button>

        <span
          data-testid="post-score"
          className={`px-2.5 font-bold text-sm sm:text-base font-mono select-none ${
            userVote === 1 ? "text-vote-up" : userVote === -1 ? "text-vote-down" : "text-foreground"
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
              ? "Kendi içeriğinize oy veremezsiniz"
              : userVote === -1
                ? "Oyu geri çek"
                : "Aşağı oy ver"
          }
          aria-label="Aşağı oy ver"
          aria-pressed={userVote === -1}
          className={`p-1.5 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background ${
            isUserAuthor
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : userVote === -1
                ? "text-vote-down bg-vote-down/10 font-bold cursor-pointer"
                : "text-muted-foreground hover:text-foreground hover:bg-card cursor-pointer"
          }`}
        >
          <ArrowBigDown className="w-5 h-5" />
        </button>
      </div>

      {/* Sağ Grup: Kaydet, Paylaş, Rapor Et ve Düzenle */}
      <div className="flex items-center gap-1.5">
        {/* Yazar Düzenle Butonu */}
        {isUserAuthor && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl border-border hover:bg-surface-2"
          >
            <Link href={`/posts/${post.id}/edit`} data-testid="post-edit-button">
              <Pencil className="w-3.5 h-3.5" />
              <span className="text-xs">Düzenle</span>
            </Link>
          </Button>
        )}

        {/* Kaydet Butonu */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          title={saved ? "Kaydedilenlerden çıkar" : (saveAriaLabel ?? "Gönderiyi kaydet")}
          aria-label={saved ? "Kaydedilenlerden çıkar" : (saveAriaLabel ?? "Kaydet")}
          aria-pressed={saved}
          className={`gap-1.5 rounded-xl ${
            saved ? "text-primary bg-primary/10 hover:bg-primary/20" : ""
          }`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
          <span className="text-xs hidden sm:inline">{saved ? "Kaydedildi" : "Kaydet"}</span>
        </Button>

        {/* Paylaş Butonu */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleShare}
          aria-label="Paylaş"
          className="gap-1.5 rounded-xl"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">Paylaş</span>
        </Button>

        {/* Şikayet Butonu */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setReportOpen(true)}
          aria-label="Şikayet et"
          data-testid="post-report-button"
          className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Flag className="w-4 h-4" />
          <span className="sr-only">Şikayet Et</span>
        </Button>

        {/* Yazar Sil Butonu (P0-12) */}
        {isUserAuthor && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label={t("common.delete")}
            data-testid="post-delete-button"
            className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">{t("common.delete")}</span>
          </Button>
        )}
      </div>

      {/* Şikayet Modalı */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetId={post.id}
        targetType="content"
      />

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
