"use client";

import { AlertCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";

interface DeleteContentDialogProps {
  contentId: string | null;
  targetType?: "post" | "comment" | string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteContentDialog({
  contentId,
  targetType,
  open,
  onOpenChange,
  onSuccess,
}: DeleteContentDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!contentId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage(t("moderation.deleteDialog.reason_required"));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/mod/contents/${encodeURIComponent(contentId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmedReason }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("moderation.deleteDialog.request_error"));
      }

      toast.success(t("moderation.deleteDialog.success"));
      setReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("moderation.resolveDialog.server_error");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span>{t("moderation.deleteDialog.title")}</span>
            </DialogTitle>
            <DialogDescription>{t("moderation.deleteDialog.description")}</DialogDescription>
          </DialogHeader>

          <div className="bg-surface-2 p-2.5 rounded-lg border border-border/80 text-xs">
            {t("moderation.deleteDialog.target", {
              type: targetType || t("moderation.deleteDialog.content_type"),
              id: contentId,
            })}
          </div>

          {errorMessage && (
            <div
              data-testid="delete-content-dialog-error"
              className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="delete-reason" className="text-xs font-medium flex items-center gap-1">
              <span>{t("moderation.deleteDialog.reason")}</span>
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              data-testid="delete-content-reason-input"
              rows={3}
              placeholder={t("moderation.deleteDialog.reason_placeholder")}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              data-testid="confirm-moderate-delete-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("moderation.deleteDialog.submitting")
                : t("moderation.deleteDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
