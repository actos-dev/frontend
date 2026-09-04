"use client";

import type { Comment } from "actos";
import { MessageSquare, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // İlke 2 Desteği: Taslak Geri Yükleme
  useEffect(() => {
    const urlDraftKey = searchParams.get("draftKey");
    const saved = getDraft<string>(draftKey);

    if (saved) {
      setText((prev) => {
        if (!prev || prev.trim() === "") {
          return saved;
        }
        return prev;
      });
      if (urlDraftKey === draftKey) {
        toast.info(t("comments.draft_restored") || "Yazdığın taslak geri yüklendi.");
      }
    }
  }, [draftKey, searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Lütfen bir yorum metni yazın.");
      return;
    }

    // İlke 2: Giriş Yapılmamışsa metin kaybolmaz, taslağa alınıp login'e yönlendirilir
    const isAuthenticated = status === "authenticated" && !!user;
    if (!isAuthenticated) {
      const returnUrl =
        typeof window !== "undefined" ? window.location.pathname : `/posts/${postId}`;
      saveDraft(draftKey, trimmed, returnUrl);
      const loginUrl = createLoginRedirectUrl(returnUrl, draftKey, trimmed);
      toast.info("Yorumunu göndermek için lütfen giriş yap. Yazdığın metin korundu.");
      router.push(loginUrl);
      return;
    }

    // Oturum açıksa sunucuya gönder
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          body: trimmed,
          parentId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.detail || json.title || "Yorum gönderilemedi.");
        return;
      }

      // Başarılı: taslağı temizle ve formu sıfırla
      clearDraft(draftKey);
      setText("");
      toast.success(t("comments.created_success") || "Yorum başarıyla paylaşıldı.");
      onSuccess?.(json.data);
    } catch {
      toast.error("Bağlantı hatası: Yorum paylaşılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultPlaceholder = parentId
    ? t("comments.reply_placeholder") || `@${replyToUsername || "yazar"}'a yanıt yaz...`
    : t("comments.write_placeholder") || "Düşüncelerini paylaş...";

  return (
    <form
      onSubmit={handleSubmit}
      data-testid={parentId ? "comment-reply-form" : "comment-root-form"}
      className={`relative rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs transition-all focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 ${className}`}
    >
      {replyToUsername && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>
            <span className="font-semibold text-foreground">@{replyToUsername}</span> adlı
            kullanıcıya yanıt veriyorsun:
          </span>
        </div>
      )}

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder || defaultPlaceholder}
        autoFocus={autoFocus}
        rows={parentId ? 3 : 4}
        className="w-full resize-y bg-transparent border-0 p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
        aria-label={placeholder || defaultPlaceholder}
      />

      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/50 flex-wrap">
        <span className="text-[11px] text-muted-foreground">Markdown desteklenir</span>

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
              {t("comments.cancel") || "İptal"}
            </Button>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !text.trim()}
            className="text-xs h-8 px-3.5 gap-1.5 font-medium shadow-2xs"
          >
            {isSubmitting ? (
              <span>{t("comments.sending") || "Gönderiliyor..."}</span>
            ) : (
              <>
                <Send className="w-3 h-3" />
                <span>{t("comments.send") || "Gönder"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
