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

interface DeleteContentDialogProps {
  contentId: string | null;
  targetType?: "post" | "comment" | string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteContentDialog({
  contentId,
  targetType = "içerik",
  open,
  onOpenChange,
  onSuccess,
}: DeleteContentDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!contentId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage("Silme gerekçesi zorunludur.");
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
        throw new Error(data.error || "İçerik silinirken bir hata oluştu.");
      }

      toast.success("İçerik moderatör tarafından başarıyla silindi.");
      setReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sunucu hatası";
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
              <span>İçeriği Moderatif Olarak Sil</span>
            </DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. İçerik soft-delete yapılarak yayından kaldırılır ve denetim
              kütüğüne gerekçeniz kaydedilir.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-surface-2 p-2.5 rounded-lg border border-border/80 text-xs">
            <span className="text-muted-foreground">Silinecek {targetType} ID: </span>
            <span className="font-mono font-medium text-foreground">{contentId}</span>
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
              <span>Silme Gerekçesi (Zorunlu)</span>
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="delete-reason"
              data-testid="delete-content-reason-input"
              rows={3}
              placeholder="Denetim kütüğüne yazılacak zorunlu gerekçe..."
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
              İptal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              data-testid="confirm-moderate-delete-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Siliniyor..." : "Gerekçeyle Sil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
