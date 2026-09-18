"use client";

import type { Post } from "actos";
import { Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReportDialog } from "@/components/post/report-dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { isAuthenticationProblem } from "@/lib/query/http";
import { useDeletePostMutation } from "@/lib/query/mutations";

export function PostRowMenu({ post, isAuthor }: { post: Post; isAuthor: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const remove = useDeletePostMutation(post.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync();
      setDeleteOpen(false);
      toast.success(t("states.postDeleted"));
      router.push("/");
    } catch (error) {
      if (isAuthenticationProblem(error)) {
        router.push(`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      } else {
        toast.error((error as { detail?: string }).detail || t("states.postDeleteFailed"));
      }
    }
  };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("postCard.more_actions")}
            className="relative z-10 inline-flex min-h-8 min-w-8 items-center justify-center rounded-sm hover:bg-bg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          {isAuthor ? (
            <Link
              href={`/posts/${post.id}/edit`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-bg-subtle"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> {t("common.edit")}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setReportOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-bg-subtle"
          >
            <Flag className="h-4 w-4" aria-hidden="true" /> {t("common.report")}
          </button>
          {isAuthor ? (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDeleteOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-bg-subtle"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> {t("common.delete")}
            </button>
          ) : null}
        </PopoverContent>
      </Popover>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetId={post.id}
        targetType="content"
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("states.postDeleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("states.postDeleteConfirmDesc", { title: post.title || "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={remove.isPending}>
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending}
            >
              {remove.isPending ? t("states.postDeleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
