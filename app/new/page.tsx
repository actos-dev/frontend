"use client";

import { Check, Loader2, LogIn, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { PostComposerFields } from "@/components/editor/post-composer-fields";
import { PostTargetField, type PostTargetValue } from "@/components/editor/post-target-field";
import { Button } from "@/components/ui/button";
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
  const [images, setImages] = React.useState<File[]>([]);
  const [community, setCommunity] = React.useState<string | null>(null);
  const [communityCanPublish, setCommunityCanPublish] = React.useState(true);

  const handleTargetResolved = React.useCallback((target: PostTargetValue) => {
    setCommunity(target.name);
    setCommunityCanPublish(target.canPublish);
  }, []);

  // Restore draft on mount
  React.useEffect(() => {
    const restored = loadDraft();
    if (restored) {
      toast.info(t("editor.draft_restored"));
    }
  }, [loadDraft, t]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim() || !body.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("body", body.trim());
      formData.append("tags", JSON.stringify(tags));
      if (community) {
        formData.append("community", community);
      }
      for (const image of images) {
        formData.append("files", image);
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        console.error("Failed to publish post:", errJson);
        // The draft is not cleared: the user's text must survive a failed
        // publish (ROADMAP.md P0-03).
        toast.error(t("states.publishFailed"));
        setIsSubmitting(false);
        return;
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
      console.error("Failed to publish post:", err);
      toast.error(t("states.publishFailed"));
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
        <PostComposerFields
          title={title}
          onTitleChange={setTitle}
          body={body}
          onBodyChange={setBody}
          tags={tags}
          onTagsChange={setTags}
          images={images}
          onImagesChange={setImages}
          disabled={isSubmitting}
          postTo={<PostTargetField disabled={isSubmitting} onResolved={handleTargetResolved} />}
        />

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
              disabled={isSubmitting || !title.trim() || !body.trim() || !communityCanPublish}
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
