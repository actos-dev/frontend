"use client";

import type { Post } from "actos";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PostTargetField, type PostTargetValue } from "@/components/editor/post-target-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { isAuthenticationProblem } from "@/lib/query/http";
import { useSessionStore } from "@/lib/stores/session-store";
import { slugify } from "@/lib/utils";

export interface CrossPostDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * `···` -> Cross-post. The target is validated with exactly the composer's
 * rule (`PostTargetField`), including "Independent". The API rejects a source
 * that lives in a private community (`403`) or is itself a cross-post (`400`);
 * the menu hides the action for a known cross-post, and any remaining refusal
 * is surfaced verbatim rather than guessed at.
 */
export function CrossPostDialog({ post, open, onOpenChange }: CrossPostDialogProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const status = useSessionStore((state) => state.status);
  const [target, setTarget] = useState<PostTargetValue>({
    name: null,
    status: "independent",
    canPublish: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (status === "unauthenticated") {
      const returnUrl =
        typeof window !== "undefined" ? window.location.pathname : `/posts/${post.id}`;
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!target.canPublish) {
      setErrorMessage(t("editor.cross_post_failed"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crossPostSource: post.id,
          community: target.name ?? undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (isAuthenticationProblem({ status: res.status, code: data?.code })) {
          router.push(
            `/login?returnUrl=${encodeURIComponent(`/posts/${post.id}/${slugify(post.title || "post")}`)}`,
          );
          return;
        }
        setErrorMessage(data?.detail || t("editor.cross_post_failed"));
        return;
      }

      toast.success(t("editor.cross_post_success"));
      onOpenChange(false);
      const created = data.data;
      if (created?.id) {
        router.push(created.slug ? `/posts/${created.id}/${created.slug}` : `/posts/${created.id}`);
      }
      router.refresh();
    } catch {
      setErrorMessage(t("editor.cross_post_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cross-post-dialog">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("editor.cross_post_title")}</DialogTitle>
            <DialogDescription>{t("editor.cross_post_description")}</DialogDescription>
          </DialogHeader>

          {post.community ? (
            <p className="text-xs text-fg-muted">
              {t("editor.cross_post_source_note", {
                title: post.title || t("postCard.untitled"),
              })}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-fg">
              {t("editor.cross_post_target_label")}
            </span>
            <PostTargetField disabled={isSubmitting} onResolved={(value) => setTarget(value)} />
          </div>

          {errorMessage ? (
            <p
              data-testid="cross-post-error"
              role="alert"
              className="text-xs font-medium text-danger"
            >
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              data-testid="cross-post-submit"
              disabled={isSubmitting || !target.canPublish}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{t("editor.cross_posting")}</span>
                </>
              ) : (
                t("editor.cross_post_submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
