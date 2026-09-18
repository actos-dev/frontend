"use client";

import type { Post } from "actos";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { PostComposerFields } from "@/components/editor/post-composer-fields";
import { Button } from "@/components/ui/button";
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
        console.error("Failed to save post changes:", errJson);
        // The edited text stays in the form: it is never cleared on a
        // failed save (ROADMAP.md P0-03).
        toast.error(t("states.saveFailed"));
        setIsSubmitting(false);
        return;
      }

      toast.success(t("editor.success_updated") || "Gönderi güncellendi!");
      router.push(`/posts/${post.id}`);
    } catch (err: unknown) {
      console.error("Failed to save post changes:", err);
      toast.error(t("states.saveFailed"));
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
        <PostComposerFields
          title={title}
          onTitleChange={setTitle}
          body={body}
          onBodyChange={setBody}
          tags={post.tags ?? []}
          existingAttachments={post.attachments ?? []}
          titleInputTestId="edit-title-input"
          disabled={isSubmitting}
          postTo={
            <div className="rounded-lg border border-border bg-surface-1 px-3.5 py-2.5 text-sm text-foreground">
              <span>{post.community ? `c/${post.community.name}` : t("editor.independent")}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {t("editor.community_read_only")}
              </span>
            </div>
          }
        />

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
