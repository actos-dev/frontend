"use client";

import type { Comment, CommentNode as CommentNodeType } from "actos";
import {
  ArrowBigDown,
  ArrowBigUp,
  CornerDownRight,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActorHoverCard } from "@/components/actor/actor-hover-card";
import { CommentForm } from "@/components/comments/comment-form";
import { CodeBlockEnhancer } from "@/components/render/code-block-enhancer";
import { ActorAvatar } from "@/components/ui/avatar";
import { ActorBadge, type ActorType } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { isAuthenticationProblem } from "@/lib/query/http";
import { useContentInteraction, useDeleteCommentMutation } from "@/lib/query/mutations";
import { useSessionStore } from "@/lib/stores/session-store";
import { formatRelativeTime } from "@/lib/utils";

export interface CommentNodeProps {
  comment: CommentNodeType;
  postId: string;
  postAuthorId?: string | null;
  postAuthorUsername?: string | null;
  highlightedCommentId?: string | null;
  depth?: number;
  maxDepth?: number;
  collapsedIds: Set<string>;
  onToggleCollapse: (commentId: string) => void;
  onCommentUpdated?: (commentId: string, newBody: string) => void;
  onCommentDeleted?: (commentId: string) => void;
  onReplyAdded?: (parentId: string, reply: Comment) => void;
}

/**
 * Counts all recursive descendant replies for collapsed summary.
 */
export function countAllReplies(node: CommentNodeType): number {
  if (!node.replies || node.replies.length === 0) return 0;
  return node.replies.reduce((acc, curr) => acc + 1 + countAllReplies(curr), 0);
}

export function CommentNodeComponent({
  comment,
  postId,
  postAuthorId,
  postAuthorUsername,
  highlightedCommentId,
  depth = 0,
  maxDepth = 6,
  collapsedIds,
  onToggleCollapse,
  onCommentUpdated,
  onCommentDeleted,
  onReplyAdded,
}: CommentNodeProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useSessionStore();

  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body || "");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const interaction = useContentInteraction(comment.id, {
    score: comment.score ?? 0,
    userVote: 0,
  });
  const { userVote, score, isVoting } = interaction;
  const deleteComment = useDeleteCommentMutation(postId, comment.id);
  const isDeleting = deleteComment.isPending;

  const isCollapsed = collapsedIds.has(comment.id);
  const isDeleted = Boolean(comment.deleted);
  const isAuthorDeleted = Boolean(comment.authorDeleted);
  const isHighlighted = highlightedCommentId === comment.id;

  // Author identity
  const author = comment.author;
  const authorType = (author?.actorType || "human") as ActorType;
  const username = author?.username || "anonim";
  const displayName = author?.displayName || username;
  const isOriginalPoster =
    !isDeleted &&
    !isAuthorDeleted &&
    Boolean(
      author &&
        ((postAuthorId && author.id && author.id === postAuthorId) ||
          ((!postAuthorId || !author.id) &&
            postAuthorUsername &&
            author.username &&
            author.username.toLocaleLowerCase() === postAuthorUsername.toLocaleLowerCase())),
    );

  // Sahiplik: Silinmemişse ve giriş yapan kullanıcı yazarsa
  const isAuthor =
    !isDeleted && !!user && (user.id === author?.id || user.username === author?.username);

  // Handle Voting (Plan §Faz 9)
  const handleVote = async (targetVote: 1 | -1) => {
    if (isVoting || isDeleted) return;

    if (!user) {
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : `/posts/${postId}`;
      router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (isAuthor) {
      toast.error(t("interactions.vote_own_forbidden") || "Kendi içeriğinize oy veremezsiniz.");
      return;
    }

    try {
      await interaction.vote(targetVote);
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : `/posts/${postId}`;
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      } else {
        toast.error((error as { detail?: string }).detail || "Oy kaydedilemedi.");
      }
    }
  };

  // Handle Edit
  const handleSaveEdit = async () => {
    const trimmed = editBody.trim();
    if (!trimmed) {
      toast.error("Yorum metni boş olamaz.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || "Yorum güncellenemedi.");
        return;
      }

      setIsEditing(false);
      onCommentUpdated?.(comment.id, trimmed);
      toast.success(t("comments.updated_success") || "Yorum güncellendi.");
    } catch {
      toast.error("Bağlantı hatası: Yorum güncellenemedi.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    try {
      const deletedBody = `[${t("comments.deleted_comment") || "Bu yorum silindi"}]`;
      await deleteComment.mutateAsync(deletedBody);
      setDeleteDialogOpen(false);
      onCommentDeleted?.(comment.id);
      toast.success(t("comments.deleted_success") || "Yorum silindi.");
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        const currentPath =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : `/posts/${postId}`;
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      } else {
        toast.error((error as { detail?: string }).detail || "Yorum silinemedi.");
      }
    }
  };

  // Plan §4.5 6-seviye girinti sınırı:
  // depth 0: kök, depth 5: 6. seviye.
  // depth >= maxDepth - 1 ise çocukları burada açma, devamını gör bağlantısı ver!
  const reachedCutoff = depth >= maxDepth - 1;
  const hasReplies = Boolean(comment.replies && comment.replies.length > 0);
  const totalHiddenReplies = countAllReplies(comment);
  const canCollapseThread = depth > 0 && hasReplies;

  return (
    <div
      data-testid={`comment-node-${comment.id}`}
      data-depth={depth}
      data-comment-highlighted={isHighlighted ? "true" : undefined}
      aria-current={isHighlighted ? "location" : undefined}
      tabIndex={isHighlighted ? -1 : undefined}
      className={`relative group/node text-sm transition-colors ${
        depth > 0 ? "mt-3 pl-3 sm:pl-4 border-l-2 border-border/60 hover:border-primary/50" : "mt-4"
      } ${isHighlighted ? "scroll-mt-24 rounded-md bg-primary/5 ring-2 ring-primary/50 ring-offset-2 ring-offset-background" : ""}`}
    >
      {canCollapseThread && (
        <button
          type="button"
          data-testid="thread-line-toggle"
          aria-label={
            isCollapsed
              ? t("comments.expand_thread") || "Yanıtları genişlet"
              : t("comments.collapse_thread") || "Yanıtları daralt"
          }
          aria-expanded={!isCollapsed}
          onClick={() => onToggleCollapse(comment.id)}
          className="absolute left-0 top-0 bottom-0 z-10 w-3 -translate-x-1/2 cursor-pointer border-0 bg-transparent p-0 hover:[&>span]:bg-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:[&>span]:bg-primary"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-border/70 transition-colors"
          />
        </button>
      )}
      {/* 1. KATLANMIŞ DURUM GÖRÜNÜMÜ */}
      {isCollapsed ? (
        <button
          type="button"
          data-testid="collapsed-summary"
          aria-label={t("comments.expand") || "Genişlet"}
          className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground transition-colors cursor-pointer select-none text-left border-0"
          onClick={() => onToggleCollapse(comment.id)}
        >
          <span
            data-testid="expand-button"
            className="p-0.5 hover:text-foreground font-mono font-bold"
          >
            [+]
          </span>
          <span className="font-semibold text-foreground">
            @{isDeleted || isAuthorDeleted ? "silindi" : username}
          </span>
          {isOriginalPoster && (
            <abbr
              data-testid="original-poster-badge"
              title={t("comments.original_poster") || "Gönderi yazarı"}
              className="inline-flex h-4 items-center rounded-sm border border-border px-1 font-mono text-[9px] font-semibold leading-none text-muted-foreground"
            >
              OP
            </abbr>
          )}
          <span className="text-muted-foreground/80">
            ({totalHiddenReplies}{" "}
            {t("comments.hidden_replies")?.replace("{count}", String(totalHiddenReplies)) ||
              `${totalHiddenReplies} yanıt gizlendi`}
            )
          </span>
          <time
            dateTime={comment.createdAt}
            className="text-[11px] text-muted-foreground/60 ml-auto"
            suppressHydrationWarning
          >
            {formatRelativeTime(comment.createdAt)}
          </time>
        </button>
      ) : (
        /* 2. AÇIK NORMAL GÖRÜNÜM */
        <div className="space-y-2">
          {/* Başlık: Avatar, Yazar, Glif+Etiket, Tarih, Katlama Butonu */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Katlama butonu [-] */}
              <button
                type="button"
                data-testid="collapse-button"
                onClick={() => onToggleCollapse(comment.id)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded-xs hover:bg-muted/50 transition-colors font-mono font-bold text-xs"
                title={t("comments.collapse") || "Daralt"}
                aria-label={t("comments.collapse") || "Daralt"}
              >
                [-]
              </button>

              {/* Avatar */}
              {isDeleted || isAuthorDeleted ? (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-mono">
                  ?
                </div>
              ) : (
                <ActorHoverCard username={username}>
                  <Link
                    href={`/u/${username}`}
                    className="relative shrink-0 rounded-full focus-visible:outline-hidden"
                  >
                    <ActorAvatar
                      actorType={authorType}
                      username={username}
                      displayName={displayName}
                      src={author?.avatarUrl}
                      size={20}
                    />
                  </Link>
                </ActorHoverCard>
              )}

              {/* Yazar Adı & Glif + Etiket Rozeti (Plan §7.3) */}
              {isDeleted ? (
                <span
                  data-testid="deleted-author"
                  className="font-semibold text-muted-foreground italic text-xs"
                >
                  [{t("comments.deleted_author") || "silindi"}]
                </span>
              ) : isAuthorDeleted ? (
                <span className="font-semibold text-muted-foreground italic text-xs">
                  [{t("comments.deleted_author") || "silindi"}]
                </span>
              ) : (
                <ActorHoverCard username={username} className="items-center gap-2">
                  <Link
                    href={`/u/${username}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors text-xs"
                  >
                    {displayName}
                  </Link>
                  <Link
                    href={`/u/${username}`}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-mono transition-colors"
                  >
                    @{username}
                  </Link>
                  <ActorBadge
                    actorType={authorType}
                    variant="full"
                    className="text-[10px] py-0 px-1.5 h-4 shadow-2xs"
                  />
                </ActorHoverCard>
              )}
              {!isDeleted && !isAuthorDeleted && isOriginalPoster && (
                <abbr
                  data-testid="original-poster-badge"
                  title={t("comments.original_poster") || "Gönderi yazarı"}
                  className="inline-flex h-4 items-center rounded-sm border border-border px-1 font-mono text-[9px] font-semibold leading-none text-muted-foreground"
                >
                  OP
                </abbr>
              )}

              {/* Tarih */}
              <time
                dateTime={comment.createdAt}
                className="text-[11px] text-muted-foreground/70 ml-1"
                title={comment.createdAt}
                suppressHydrationWarning
              >
                {formatRelativeTime(comment.createdAt)}
              </time>

              {/* Düzenlendi Göstergesi */}
              {comment.editedAt && !isDeleted && (
                <span
                  data-testid="edited-badge"
                  className="text-[11px] text-muted-foreground/60 italic"
                  title={comment.editedAt ? `Düzenlendi: ${comment.editedAt}` : "Düzenlendi"}
                  suppressHydrationWarning
                >
                  ({t("comments.edited") || "düzenlendi"})
                </span>
              )}
            </div>
          </div>

          {/* Gövde veya Düzenleme Formu */}
          {isEditing ? (
            <div className="space-y-2 mt-2 pt-1">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                className="w-full text-sm rounded-lg border-border"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingEdit}
                  className="text-xs h-7 px-2.5"
                >
                  {t("comments.cancel") || "İptal"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || !editBody.trim()}
                  className="text-xs h-7 px-3"
                >
                  {isSavingEdit
                    ? t("comments.saving") || "Kaydediliyor..."
                    : t("comments.save") || "Kaydet"}
                </Button>
              </div>
            </div>
          ) : isDeleted ? (
            /* Silinmiş Yorum Sözleşmesi: YAPILACAKLAR.md §3 */
            <p
              data-testid="deleted-comment-notice"
              className="italic text-muted-foreground/70 text-xs sm:text-sm py-1"
            >
              [{t("comments.deleted_comment") || "Bu yorum silindi"}]
            </p>
          ) : (
            <div className="text-foreground/90 text-sm leading-relaxed break-words py-0.5">
              {comment.bodyHtml ? (
                <CodeBlockEnhancer>
                  <div
                    className="prose prose-comment"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered and sanitized by Markstone
                    dangerouslySetInnerHTML={{ __html: comment.bodyHtml }}
                  />
                </CodeBlockEnhancer>
              ) : (
                <p className="whitespace-pre-wrap">{comment.body}</p>
              )}
            </div>
          )}

          {/* Alt Aksiyon Çubuğu: Oy Verme, Yanıtla, Düzenle, Sil */}
          {!isDeleted && !isEditing && (
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground flex-wrap">
              {/* Oy verme */}
              <div className="inline-flex items-center gap-0.5 bg-muted/30 rounded-md px-1 py-0.5 border border-border/40">
                <button
                  type="button"
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
                  className={`p-0.5 rounded-xs transition-colors ${
                    isAuthor
                      ? "opacity-50 cursor-not-allowed text-muted-foreground"
                      : userVote === 1
                        ? "text-vote-up font-bold"
                        : "text-muted-foreground hover:text-foreground disabled:opacity-50"
                  }`}
                >
                  <ArrowBigUp className="w-3.5 h-3.5" />
                </button>
                <span
                  data-testid="comment-score"
                  className={`px-1 font-mono text-[11px] font-semibold min-w-4 text-center ${
                    userVote === 1
                      ? "text-vote-up"
                      : userVote === -1
                        ? "text-vote-down"
                        : "text-foreground/80"
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
                  className={`p-0.5 rounded-xs transition-colors ${
                    isAuthor
                      ? "opacity-50 cursor-not-allowed text-muted-foreground"
                      : userVote === -1
                        ? "text-vote-down font-bold"
                        : "text-muted-foreground hover:text-foreground disabled:opacity-50"
                  }`}
                >
                  <ArrowBigDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Yanıtla Butonu */}
              <button
                type="button"
                onClick={() => setIsReplying(!isReplying)}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium py-1 px-1.5 rounded-sm hover:bg-muted/40 cursor-pointer"
              >
                <MessageSquare className="w-3 h-3" />
                <span>{t("comments.reply") || "Yanıtla"}</span>
              </button>

              {/* Sahiplik Butonları: Düzenle & Sil */}
              {isAuthor && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium py-1 px-1.5 rounded-sm hover:bg-muted/40 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{t("comments.edit") || "Düzenle"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="inline-flex items-center gap-1 hover:text-destructive transition-colors font-medium py-1 px-1.5 rounded-sm hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t("comments.delete") || "Sil"}</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Inline Yanıt Formu */}
          {isReplying && (
            <div className="mt-3 pl-2 sm:pl-4 border-l-2 border-primary/40">
              <CommentForm
                postId={postId}
                parentId={comment.id}
                replyToUsername={username}
                autoFocus
                onSuccess={(newReply) => {
                  setIsReplying(false);
                  onReplyAdded?.(comment.id, newReply);
                }}
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}

          {/* 3. ALTI SEVİYE SINIRI VE ALT YANITLAR (Plan §4.5) */}
          {hasReplies && (
            <div className="space-y-2 mt-2">
              {reachedCutoff ? (
                /* Girinti 6. seviyede durur -> "Devamını gör →" bağlantısı */
                <div className="pt-2 pb-1">
                  <Link
                    href={`/posts/${postId}/comments/${comment.id}`}
                    data-testid="continue-thread-link"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors p-1.5 rounded-md bg-primary/5 border border-primary/20"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>{t("comments.continue_thread") || "Devamını gör →"}</span>
                    <span className="text-muted-foreground font-normal">
                      ({comment.replies.length} doğrudan yanıt)
                    </span>
                  </Link>
                </div>
              ) : (
                /* Normal özyinelemeli render (depth < maxDepth - 1) */
                comment.replies.map((reply) => (
                  <CommentNodeComponent
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    postAuthorId={postAuthorId}
                    postAuthorUsername={postAuthorUsername}
                    highlightedCommentId={highlightedCommentId}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                    collapsedIds={collapsedIds}
                    onToggleCollapse={onToggleCollapse}
                    onCommentUpdated={onCommentUpdated}
                    onCommentDeleted={onCommentDeleted}
                    onReplyAdded={onReplyAdded}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Silme Onay Diyalogu */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("comments.delete_confirm_title") || "Yorumu Sil"}</DialogTitle>
            <DialogDescription>
              {t("comments.delete_confirm_desc") ||
                "Bu yorumu silmek istediğinden emin misin? Altındaki yanıtlar korunacaktır ancak içerik maskelenecektir."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isDeleting}>
                {t("comments.cancel") || "İptal"}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              data-testid="confirm-delete-button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Siliniyor..." : t("comments.delete") || "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
