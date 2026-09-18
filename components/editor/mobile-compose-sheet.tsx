"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { PostComposerFields } from "@/components/editor/post-composer-fields";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { useEditorDraftStore } from "@/lib/stores/editor-draft";

export function MobileComposeSheet() {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { title, body, tags, setTitle, setBody, setTags, loadDraft, clearDraft, hasDraft } =
    useEditorDraftStore();

  useEffect(() => {
    if (open) loadDraft();
  }, [loadDraft, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !title.trim() || !body.trim()) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("body", body.trim());
      formData.append("tags", JSON.stringify(tags));
      for (const image of images) formData.append("files", image);
      const response = await fetch("/api/posts", { method: "POST", body: formData });
      if (!response.ok) {
        toast.error(t("states.publishFailed"));
        return;
      }
      const result = await response.json();
      clearDraft();
      setImages([]);
      setOpen(false);
      toast.success(t("editor.success_created"));
      const post = result.data;
      router.push(post?.id ? `/posts/${post.id}${post.slug ? `/${post.slug}` : ""}` : "/");
    } catch {
      toast.error(t("states.publishFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-testid="mobile-compose-trigger"
          aria-label={t("nav.newPost")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-fg text-bg transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent aria-describedby="mobile-compose-description">
        <SheetHeader className="shrink-0 border-b border-border pb-3">
          <div className="flex items-center justify-between gap-4">
            <SheetTitle>{t("editor.title")}</SheetTitle>
            {hasDraft && (
              <span className="text-xs text-muted-foreground">{t("editor.draft_saved")}</span>
            )}
          </div>
          <SheetDescription id="mobile-compose-description">
            {t("editor.mobile_description")}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col"
          data-testid="mobile-compose-form"
        >
          <div className="min-h-0 flex-1 overflow-y-auto py-3 pr-1">
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
            />
          </div>
          <SheetFooter className="shrink-0 border-t border-border">
            <Button
              type="submit"
              data-testid="mobile-compose-publish"
              disabled={isSubmitting || !title.trim() || !body.trim()}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? t("editor.publishing") : t("editor.publish")}
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="ghost" disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
