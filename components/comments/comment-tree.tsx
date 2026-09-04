"use client";

import type { Comment, CommentNode as CommentNodeType } from "actos";
import { ArrowDownUp, MessageSquare, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CommentForm } from "@/components/comments/comment-form";
import { CommentNodeComponent } from "@/components/comments/comment-node";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";

export interface CommentTreeProps {
  postId: string;
  initialComments: CommentNodeType[];
  postSlug?: string;
  className?: string;
}

const COLLAPSED_STORAGE_KEY = "actos_collapsed_comments";

function getStoredCollapsed(): Set<string> {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return new Set();
  }
  try {
    const raw = window.sessionStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function storeCollapsed(collapsed: Set<string>): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(Array.from(collapsed)));
  } catch {
    // Ignore quota issues
  }
}

/**
 * Recursively updates a comment node in the tree.
 */
function updateCommentInTree(
  nodes: CommentNodeType[],
  commentId: string,
  updater: (node: CommentNodeType) => CommentNodeType,
): CommentNodeType[] {
  return nodes.map((node) => {
    if (node.id === commentId) {
      return updater(node);
    }
    if (node.replies && node.replies.length > 0) {
      return {
        ...node,
        replies: updateCommentInTree(node.replies, commentId, updater),
      };
    }
    return node;
  });
}

/**
 * Recursively appends a reply to its parent comment node in the tree.
 */
function appendReplyToTree(
  nodes: CommentNodeType[],
  parentId: string,
  reply: Comment,
): CommentNodeType[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      const newReplyNode: CommentNodeType = {
        ...reply,
        replies: [],
      };
      return {
        ...node,
        commentCount: (node.commentCount ?? 0) + 1,
        replies: [...(node.replies || []), newReplyNode],
      };
    }
    if (node.replies && node.replies.length > 0) {
      return {
        ...node,
        replies: appendReplyToTree(node.replies, parentId, reply),
      };
    }
    return node;
  });
}

export function CommentTree({ postId, initialComments, className = "" }: CommentTreeProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<CommentNodeType[]>(initialComments);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [isLoadingSort, setIsLoadingSort] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Plan §4.5: Katlı durum sayfa oturumu boyunca tutulur
  useEffect(() => {
    setCollapsedIds(getStoredCollapsed());
  }, []);

  const handleToggleCollapse = useCallback((commentId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      storeCollapsed(next);
      return next;
    });
  }, []);

  // Sıralama Değiştirme
  const handleSortChange = async (newSort: "top" | "new") => {
    if (newSort === sort || isLoadingSort) return;
    setSort(newSort);
    setIsLoadingSort(true);

    try {
      const res = await fetch(`/api/comments?postId=${encodeURIComponent(postId)}&sort=${newSort}`);
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.data)) {
        setComments(data.data);
      }
    } catch {
      toast.error("Yorumlar sıralanırken bir hata oluştu.");
    } finally {
      setIsLoadingSort(false);
    }
  };

  // Yeni Üst Düzey Yorum Eklendiğinde
  const handleRootCommentCreated = (newComment: Comment) => {
    const newNode: CommentNodeType = {
      ...newComment,
      replies: [],
    };
    setComments((prev) => [newNode, ...prev]);
  };

  // Alt Yanıt Eklendiğinde
  const handleReplyAdded = (parentId: string, reply: Comment) => {
    setComments((prev) => appendReplyToTree(prev, parentId, reply));
  };

  // Yorum Güncellendiğinde
  const handleCommentUpdated = (commentId: string, newBody: string) => {
    setComments((prev) =>
      updateCommentInTree(prev, commentId, (node) => ({
        ...node,
        body: newBody,
        bodyHtml: null, // Forces plain fallback or updated text
        editedAt: new Date().toISOString(),
      })),
    );
  };

  // Yorum Silindiğinde (YAPILACAKLAR.md §3: deleted boolean bayrağı, çocuklar kopmaz!)
  const handleCommentDeleted = (commentId: string) => {
    setComments((prev) =>
      updateCommentInTree(prev, commentId, (node) => ({
        ...node,
        deleted: true,
        authorDeleted: true,
        body: `[${t("comments.deleted_comment") || "Bu yorum silindi"}]`,
        bodyHtml: `<p>[${t("comments.deleted_comment") || "Bu yorum silindi"}]</p>`,
      })),
    );
  };

  return (
    <section
      data-testid="comment-tree"
      className={`space-y-6 pt-6 border-t border-border/70 ${className}`}
      aria-labelledby="comments-heading"
    >
      {/* 1. Üst Başlık ve Sıralama Seçenekleri (PLAN.md §562) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 id="comments-heading" className="text-lg font-bold tracking-tight">
            {t("comments.title") || "Yorumlar"}
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {comments.length}
            </span>
          </h2>
        </div>

        {/* Sıralama Seçimi */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50 text-xs">
          <Button
            type="button"
            variant={sort === "top" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleSortChange("top")}
            disabled={isLoadingSort}
            className="h-7 px-2.5 text-xs font-medium"
            data-testid="sort-top"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {t("comments.sort_top") || "En İyi"}
          </Button>

          <Button
            type="button"
            variant={sort === "new" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleSortChange("new")}
            disabled={isLoadingSort}
            className="h-7 px-2.5 text-xs font-medium"
            data-testid="sort-new"
          >
            <ArrowDownUp className="w-3 h-3 mr-1" />
            {t("comments.sort_new") || "En Yeni"}
          </Button>
        </div>
      </div>

      {/* 2. Ana Yorum Yazma Formu (İlke 2 Korumalı) */}
      <div className="pt-2">
        <CommentForm postId={postId} onSuccess={handleRootCommentCreated} />
      </div>

      {/* 3. Yorum Ağacı / Boş Durum */}
      {comments.length === 0 ? (
        <div
          data-testid="comments-empty"
          className="py-12 px-4 text-center rounded-xl border border-dashed border-border/80 bg-card/40"
        >
          <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">
            {t("comments.empty") || "Henüz yorum yapılmamış. İlk yorumu sen yap!"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40 space-y-4">
          {comments.map((comment) => (
            <CommentNodeComponent
              key={comment.id}
              comment={comment}
              postId={postId}
              depth={0}
              maxDepth={6}
              collapsedIds={collapsedIds}
              onToggleCollapse={handleToggleCollapse}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
              onReplyAdded={handleReplyAdded}
            />
          ))}
        </div>
      )}
    </section>
  );
}
