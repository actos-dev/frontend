"use client";

import type { Comment } from "actos";
import { MessageSquare, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImageUploader } from "@/components/editor/image-uploader";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { clearDraft, createLoginRedirectUrl, getDraft, saveDraft } from "@/lib/drafts";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";

export interface CommentFormProps {
  postId: string;
  parentId?: string | null;
  replyToUsername?: string;
  autoFocus?: boolean;
  placeholder?: string;
  onSuccess?: (createdComment: Comment) => void;
  onCancel?: () => void;
  className?: string;
}

const MAX_COMMENT_IMAGES = 4;

export function CommentForm({
  postId,
  parentId = null,
  replyToUsername,
  autoFocus = false,
  placeholder,
  onSuccess,
  onCancel,
  className = "",
}: CommentFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status } = useSessionStore();

  const draftKey = `comment_${postId}_${parentId || "root"}`;
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isExpanded, setIsExpanded] = useState(autoFocus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const focusEditorAfterExpand = useRef(autoFocus);

  useEffect(() => {
    if (!isExpanded || !focusEditorAfterExpand.current) return;

    formRef.current
      ?.querySelector<HTMLTextAreaElement>('[data-testid="markdown-textarea"]')
      ?.focus();
    focusEditorAfterExpand.current = false;
  }, [isExpanded]);

  // Restore the existing text-only draft contract after a login redirect.
  useEffect(() => {
    const urlDraftKey = searchParams.get("draftKey");
    const saved = getDraft<string>(draftKey);

    if (saved) {
      setText((prev) => (prev.trim() ? prev : saved));
      setIsExpanded(true);
      if (urlDraftKey === draftKey) {
        toast.info(t("comments.draft_restored"));
      }
    }
  }, [draftKey, searchParams, t]);

  const expandAndFocus = () => {
    if (isExpanded) return;
    focusEditorAfterExpand.current = true;
    setIsExpanded(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!isSubmitting) e.currentTarget.requestSubmit();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error(t("comments.empty_error"));
      return;
    }

    // Keep the existing behavior: unauthenticated drafts are saved before
    // sending the reader to login. Browser File objects are not persisted.
    const isAuthenticated = status === "authenticated" && !!user;
    if (!isAuthenticated) {
      const returnUrl =
        typeof window !== "undefined" ? window.location.pathname : `/posts/${postId}`;
      saveDraft(draftKey, trimmed, returnUrl);
      const loginUrl = createLoginRedirectUrl(returnUrl, draftKey, trimmed);
      toast.info(t("comments.login_required"));
      router.push(loginUrl);
      return;
    }

    setIsSubmitting(true);
    try {
      let requestBody: BodyInit;
      const headers: HeadersInit = {};
      if (files.length > 0) {
        const formData = new FormData();
        formData.set("postId", postId);
        formData.set("body", trimmed);
        if (parentId) formData.set("parentId", parentId);
        for (const file of files) formData.append("files", file, file.name);
        requestBody = formData;
      } else {
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify({ postId, body: trimmed, parentId });
      }

      const res = await fetch("/api/comments", {
        method: "POST",
        headers,
        body: requestBody,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.detail || json.title || t("comments.create_error"));
        return;
      }

      clearDraft(draftKey);
      setText("");
      setFiles([]);
      if (!parentId) setIsExpanded(false);
      toast.success(t("comments.created_success"));
      onSuccess?.(json.data);
    } catch {
      toast.error(t("comments.create_network_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultPlaceholder = parentId
    ? replyToUsername
      ? t("comments.reply_placeholder_to", { username: replyToUsername })
      : t("comments.reply_placeholder")
    : t("comments.write_placeholder");

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      data-testid={parentId ? "comment-reply-form" : "comment-root-form"}
      data-expanded={isExpanded}
      className={`relative rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs transition-all focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 ${className}`}
    >
      {replyToUsername && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>{t("comments.replying_to", { username: replyToUsername })}</span>
        </div>
      )}

      {isExpanded ? (
        <MarkdownEditor
          value={text}
          onChange={setText}
          placeholder={placeholder || defaultPlaceholder}
          disabled={isSubmitting}
          minRows={4}
          compact
          className="border-0 rounded-none bg-transparent"
        />
      ) : (
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            expandAndFocus();
          }}
          onFocus={expandAndFocus}
          placeholder={placeholder || t("comments.add_comment")}
          rows={1}
          className="min-h-10 w-full resize-none bg-transparent border-0 p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
          aria-label={placeholder || t("comments.add_comment")}
        />
      )}

      {isExpanded && (
        <div className="mt-3 space-y-3">
          <ImageUploader
            files={files}
            onFilesChange={setFiles}
            maxFiles={MAX_COMMENT_IMAGES}
            contentLabel={t("comments.content_label")}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground">{t("comments.markdown_hint")}</span>

            <div className="flex items-center gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="text-xs h-8 px-3"
                >
                  {t("comments.cancel")}
                </Button>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !text.trim()}
                className="text-xs h-8 px-3.5 gap-1.5 font-medium shadow-2xs"
              >
                {isSubmitting ? (
                  <span>{t("comments.sending")}</span>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>{t("comments.send")}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
