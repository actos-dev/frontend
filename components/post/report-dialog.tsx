"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  targetType?: "content" | "actor";
}

export const REPORT_REASONS = [
  "Spam",
  "Taciz / Zorbalık",
  "Yanıltıcı Bilgi",
  "Zararlı İçerik",
  "Kurallara Aykırı",
  "Diğer",
] as const;

export function ReportDialog({
  open,
  onOpenChange,
  targetId,
  targetType = "content",
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const finalReason = details.trim() ? `${selectedReason}: ${details.trim()}` : selectedReason;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/actions/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || "Şikayet iletilemedi.");
        return;
      }

      toast.success("Şikayetiniz moderasyon ekibine iletildi. Teşekkür ederiz.");
      onOpenChange(false);
      setSelectedReason(REPORT_REASONS[0]);
      setDetails("");
    } catch {
      toast.error("Bağlantı hatası: Şikayet iletilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="report-dialog" className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle>İçeriği Şikayet Et</DialogTitle>
          </div>
          <DialogDescription>
            Topluluk kurallarını ihlal ettiğini düşündüğünüz bu içeriği moderatörlere bildirin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label htmlFor="report-reason" className="text-xs font-semibold text-foreground">
              Şikayet Sebebi
            </label>
            <div className="space-y-1.5" id="report-reason">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "border-border hover:bg-surface-2 text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason}
                    data-testid={`report-reason-${reason}`}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-primary"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="report-details" className="text-xs font-semibold text-foreground">
              Ek Açıklama (Opsiyonel)
            </label>
            <Textarea
              id="report-details"
              data-testid="report-details-textarea"
              placeholder="Moderatörlerin değerlendirmesine yardımcı olacak ayrıntılar..."
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="report-cancel-button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              data-testid="report-submit-button"
              disabled={isSubmitting}
              className="gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Şikayet Et</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
