"use client";

import { Check, Loader2, LogIn, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ImageUploader } from "@/components/editor/image-uploader";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { TagsInput } from "@/components/editor/tags-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { useEditorDraftStore } from "@/lib/stores/editor-draft";
import { useSessionStore } from "@/lib/stores/session-store";

export default function NewPostPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, status } = useSessionStore();

  const { title, body, tags, setTitle, setBody, setTags, loadDraft, clearDraft, hasDraft } =
    useEditorDraftStore();

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Restore draft on mount
  React.useEffect(() => {
    const restored = loadDraft();
    if (restored) {
      toast.info(t("editor.draft_restored"));
    }
  }, [loadDraft, t]);

  const handleImageUploaded = (snippet: string) => {
    setBody(body ? `${body.trim()}\n\n${snippet}` : snippet);
  };

  const handleImagePaste = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data?.url) {
          const altText = file.name.replace(/\.[^.]+$/, "") || "görsel";
          handleImageUploaded(`![${altText}](${json.data.url})\n`);
          toast.success("Görsel yüklendi.");
        }
      }
    } catch {
      // Ignored here; ImageUploader displays friendly feedback
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim() || !body.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          tags,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Gönderi oluşturulamadı.");
      }

      const json = await res.json();
      clearDraft();
      toast.success(t("editor.success_created") || "Gönderi başarıyla yayınlandı!");

      const postData = json.data;
      const targetSlug = postData?.slug;
      const targetId = postData?.id;
      if (targetId) {
        router.push(targetSlug ? `/posts/${targetId}/${targetSlug}` : `/posts/${targetId}`);
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
      setIsSubmitting(false);
    }
  };

  // Auth gate check
  if (status === "unauthenticated" || (!user && status !== "loading" && status !== "idle")) {
    return (
      <main className="max-w-3xl mx-auto py-12 px-4">
        <div
          data-testid="login-required-card"
          className="rounded-xl border border-border bg-card p-8 text-center space-y-5 shadow-xs"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <LogIn className="w-6 h-6" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">
              {t("editor.login_required_title")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("editor.login_required_desc")}
            </p>
          </div>
          <div className="pt-2">
            <Link href="/login?returnUrl=/new">
              <Button size="lg" className="font-medium gap-2">
                <LogIn className="w-4 h-4" />
                {t("editor.login_button")}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-serif">{t("editor.title")}</h1>
        </div>
        {hasDraft && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-success" />
              {t("editor.draft_saved")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearDraft}
              data-testid="clear-draft-button"
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("editor.clear_draft")}
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Field */}
        <div className="space-y-2">
          <label htmlFor="post-title" className="block text-sm font-semibold text-foreground">
            {t("editor.title_label")}
          </label>
          <Input
            id="post-title"
            data-testid="post-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("editor.title_placeholder")}
            disabled={isSubmitting}
            maxLength={300}
            className="text-lg font-medium py-2.5 px-3.5 h-auto bg-card"
            required
          />
        </div>

        {/* Tags Field */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">{t("editor.tags_label")}</div>
          <TagsInput value={tags} onChange={setTags} maxTags={5} disabled={isSubmitting} />
          <p className="text-[11px] text-muted-foreground">{t("editor.tags_hint")}</p>
        </div>

        {/* Image Uploader */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">{t("editor.upload_image")}</div>
          <ImageUploader onImageUploaded={handleImageUploaded} disabled={isSubmitting} />
        </div>

        {/* Markdown Editor */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">{t("editor.body_label")}</div>
          <MarkdownEditor
            value={body}
            onChange={setBody}
            placeholder={t("editor.body_placeholder")}
            disabled={isSubmitting}
            onImagePaste={handleImagePaste}
          />
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            {hasDraft && (
              <span className="text-xs text-muted-foreground flex sm:hidden items-center gap-1">
                <Check className="w-3.5 h-3.5 text-success" />
                {t("editor.draft_saved")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button type="button" variant="ghost" disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
            </Link>
            <Button
              type="submit"
              data-testid="publish-button"
              disabled={isSubmitting || !title.trim() || !body.trim()}
              className="min-w-[120px] font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("editor.publishing")}</span>
                </>
              ) : (
                <span>{t("editor.publish")}</span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}
