"use client";

import type { Post } from "actos";
import { ArrowLeft, Hash, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ImageUploader } from "@/components/editor/image-uploader";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";

export interface EditPostFormProps {
  post: Post;
}

export function EditPostForm({ post }: EditPostFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, status } = useSessionStore();

  const [title, setTitle] = React.useState(post.title || "");
  const [body, setBody] = React.useState(post.body || "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Ownership check: must be logged in and match author's username or id
  const isOwner =
    Boolean(user) && (user?.username === post.author?.username || user?.id === post.author?.id);

  // Handle image upload addition
  const handleImageUploaded = (snippet: string) => {
    setBody((prev) => (prev ? `${prev.trim()}\n\n${snippet}` : snippet));
  };

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim() || !body.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Gönderi güncellenemedi.");
      }

      toast.success(t("editor.success_updated") || "Gönderi güncellendi!");
      router.push(`/posts/${post.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Güncelleme sırasında bir hata oluştu.");
      setIsSubmitting(false);
    }
  };

  // While checking auth on initial render, show lightweight loading
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Yükleniyor...</span>
      </div>
    );
  }

  // Sahiplik kontrolü (403): Kullanıcı postun yazarı değilse veya giriş yapmamışsa
  if (!isOwner) {
    return (
      <main className="max-w-xl mx-auto py-16 px-4">
        <div
          data-testid="forbidden-edit-card"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4 shadow-xs"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-foreground">{t("editor.forbidden_title")}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("editor.forbidden_desc")}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link href={`/posts/${post.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                {t("editor.back_to_post")}
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
        <div className="flex items-center gap-3">
          <Link href={`/posts/${post.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
              <span className="sr-only">{t("editor.back_to_post")}</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground font-serif">
            {t("editor.edit_title")}
          </h1>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* Title Field */}
        <div className="space-y-2">
          <label htmlFor="edit-post-title" className="block text-sm font-semibold text-foreground">
            {t("editor.title_label")}
          </label>
          <Input
            id="edit-post-title"
            data-testid="edit-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("editor.title_placeholder")}
            disabled={isSubmitting}
            maxLength={300}
            className="text-lg font-medium py-2.5 px-3.5 h-auto bg-card"
            required
          />
        </div>

        {/* Existing Tags (Read-only as backend UpdatePostRequest doesn't modify tags) */}
        {post.tags && post.tags.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">{t("editor.tags_label")}</div>
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="font-mono text-xs flex items-center gap-1"
                >
                  <Hash className="w-3 h-3 text-muted-foreground" />
                  <span>{tag}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

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
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Link href={`/posts/${post.id}`}>
            <Button type="button" variant="ghost" disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
          </Link>
          <Button
            type="submit"
            data-testid="update-button"
            disabled={isSubmitting || !title.trim() || !body.trim()}
            className="min-w-[120px] font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("editor.updating")}</span>
              </>
            ) : (
              <span>{t("editor.update")}</span>
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}
