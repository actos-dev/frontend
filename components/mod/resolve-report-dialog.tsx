"use client";

import type { Report } from "actos";
import { AlertCircle, Ban, CheckCircle2, Trash2, XCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

interface ResolveReportDialogProps {
  report: Report | null;
  mode: "resolve" | "dismiss";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedReport: Report) => void;
}

export function ResolveReportDialog({
  report,
  mode,
  open,
  onOpenChange,
  onSuccess,
}: ResolveReportDialogProps) {
  const [action, setAction] = useState<"none" | "delete_content" | "ban_actor">("none");
  const [note, setNote] = useState("");
  const [banUsername, setBanUsername] = useState("");
  const [banDuration, setBanDuration] = useState<"1d" | "3d" | "7d" | "30d" | "permanent">("7d");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!report) return null;

  const isResolve = mode === "resolve";

  const handleReset = () => {
    setAction("none");
    setNote("");
    setBanUsername("");
    setBanDuration("7d");
    setErrorMessage(null);
  };

  const calculateExpiresAt = (duration: string): string | null => {
    if (duration === "permanent") return null;
    const days = Number.parseInt(duration, 10) || 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setErrorMessage(
        isResolve
          ? "Moderatör notu zorunludur. Lütfen karar gerekçenizi girin."
          : "Reddetme gerekçesi / notu zorunludur.",
      );
      return;
    }

    if (isResolve && action === "ban_actor" && !banUsername.trim()) {
      setErrorMessage("Banlanacak kullanıcının kullanıcı adı zorunludur.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        status: isResolve ? "resolved" : "dismissed",
        notes: trimmedNote,
        action,
      };

      if (action === "delete_content") {
        payload.contentId = report.targetId;
        payload.deleteReason = trimmedNote;
      } else if (action === "ban_actor") {
        payload.username = banUsername.trim();
        payload.banReason = trimmedNote;
        payload.expiresAt = calculateExpiresAt(banDuration);
      }

      const res = await fetch(`/api/mod/reports/${encodeURIComponent(report.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "İşlem sırasında bir hata oluştu.");
      }

      toast.success(
        isResolve
          ? "Şikayet başarıyla çözüldü olarak işaretlendi."
          : "Şikayet geçersiz/reddedildi olarak kapatıldı.",
      );

      handleReset();
      onOpenChange(false);
      onSuccess?.(data.report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sunucu hatası";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleReset();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isResolve ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>Şikayeti Çözümle</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                  <span>Şikayeti Reddet / Kapat</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Rapor ID: <span className="font-mono text-foreground font-semibold">{report.id}</span>{" "}
              — Hedef:{" "}
              <span className="font-mono text-foreground">
                {report.targetType}:{report.targetId}
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Rapor Detayı Özeti */}
          <div className="bg-surface-2 p-3 rounded-xl border border-border/80 text-xs space-y-1">
            <div className="text-muted-foreground">Şikayet Gerekçesi:</div>
            <div className="font-medium text-foreground">{report.reason}</div>
          </div>

          {/* Hata Uyarısı */}
          {errorMessage && (
            <div
              data-testid="resolve-dialog-error"
              className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Çözüm Eylemi Seçimi (Sadece Çöz Modunda) */}
          {isResolve && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Uygulanacak Eylem</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAction("none")}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition-all ${
                    action === "none"
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border/80 hover:bg-surface-2 text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Sadece Çözüldü İşaretle</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction("delete_content")}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition-all ${
                    action === "delete_content"
                      ? "border-destructive bg-destructive/10 text-destructive font-medium"
                      : "border-border/80 hover:bg-surface-2 text-muted-foreground"
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                  <span>İçeriği Sil</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction("ban_actor")}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition-all ${
                    action === "ban_actor"
                      ? "border-destructive bg-destructive/10 text-destructive font-medium"
                      : "border-border/80 hover:bg-surface-2 text-muted-foreground"
                  }`}
                >
                  <Ban className="w-4 h-4 text-destructive shrink-0" />
                  <span>Kullanıcıyı Banla</span>
                </button>
              </div>
            </div>
          )}

          {/* Kullanıcı Banlama Ek Alanları */}
          {isResolve && action === "ban_actor" && (
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="ban-username" className="text-xs font-medium text-destructive">
                  Banlanacak Kullanıcı Adı *
                </Label>
                <Input
                  id="ban-username"
                  data-testid="resolve-ban-username-input"
                  placeholder="örn. spammer_bot"
                  value={banUsername}
                  onChange={(e) => setBanUsername(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-destructive">Ban Süresi</Label>
                <div className="grid grid-cols-5 gap-1 text-xs">
                  {(["1d", "3d", "7d", "30d", "permanent"] as const).map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setBanDuration(dur)}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                        banDuration === dur
                          ? "bg-destructive text-destructive-foreground font-semibold border-destructive"
                          : "border-border/80 hover:bg-surface-2"
                      }`}
                    >
                      {dur === "1d" && "1 Gün"}
                      {dur === "3d" && "3 Gün"}
                      {dur === "7d" && "7 Gün"}
                      {dur === "30d" && "30 Gün"}
                      {dur === "permanent" && "Kalıcı"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Zorunlu Moderatör Notu */}
          <div className="space-y-1.5">
            <Label htmlFor="mod-note" className="text-xs font-medium flex items-center gap-1">
              <span>{isResolve ? "Moderatör Notu (Zorunlu)" : "Reddetme Notu (Zorunlu)"}</span>
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="mod-note"
              data-testid="resolve-report-note-input"
              rows={3}
              placeholder={
                isResolve
                  ? "İnceleme sonucu ve alınan aksiyon hakkında not..."
                  : "Bu şikayetin neden reddedildiğini açıklayın..."
              }
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
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
              size="sm"
              data-testid="resolve-report-submit-button"
              disabled={isSubmitting}
              variant={isResolve ? "default" : "destructive"}
            >
              {isSubmitting ? "İşleniyor..." : isResolve ? "Şikayeti Çözümle" : "Şikayeti Reddet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
