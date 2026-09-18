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
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();
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
          ? t("moderation.resolveDialog.resolve_note_required")
          : t("moderation.resolveDialog.dismiss_note_required"),
      );
      return;
    }

    if (isResolve && action === "ban_actor" && !banUsername.trim()) {
      setErrorMessage(t("moderation.resolveDialog.ban_username_required"));
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
        throw new Error(data.error || t("moderation.resolveDialog.request_error"));
      }

      toast.success(
        isResolve
          ? t("moderation.resolveDialog.resolved_success")
          : t("moderation.resolveDialog.dismissed_success"),
      );

      handleReset();
      onOpenChange(false);
      onSuccess?.(data.report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("moderation.resolveDialog.server_error");
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
                  <span>{t("moderation.resolveDialog.resolve_title")}</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                  <span>{t("moderation.resolveDialog.dismiss_title")}</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("moderation.resolveDialog.report_target", {
                reportId: report.id,
                target: `${report.targetType}:${report.targetId}`,
              })}
            </DialogDescription>
          </DialogHeader>

          {/* Rapor Detayı Özeti */}
          <div className="bg-surface-2 p-3 rounded-xl border border-border/80 text-xs space-y-1">
            <div className="text-muted-foreground">{t("moderation.resolveDialog.reason")}</div>
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
              <Label className="text-xs font-medium">
                {t("moderation.resolveDialog.action_label")}
              </Label>
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
                  <span>{t("moderation.resolveDialog.action_none")}</span>
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
                  <span>{t("moderation.resolveDialog.action_delete")}</span>
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
                  <span>{t("moderation.resolveDialog.action_ban")}</span>
                </button>
              </div>
            </div>
          )}

          {/* Kullanıcı Banlama Ek Alanları */}
          {isResolve && action === "ban_actor" && (
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="ban-username" className="text-xs font-medium text-destructive">
                  {t("moderation.resolveDialog.ban_username")}
                </Label>
                <Input
                  id="ban-username"
                  data-testid="resolve-ban-username-input"
                  placeholder={t("moderation.resolveDialog.ban_username_placeholder")}
                  value={banUsername}
                  onChange={(e) => setBanUsername(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-destructive">
                  {t("moderation.resolveDialog.ban_duration")}
                </Label>
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
                      {t(`moderation.resolveDialog.duration_${dur}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Zorunlu Moderatör Notu */}
          <div className="space-y-1.5">
            <Label htmlFor="mod-note" className="text-xs font-medium flex items-center gap-1">
              <span>
                {isResolve
                  ? t("moderation.resolveDialog.resolve_note")
                  : t("moderation.resolveDialog.dismiss_note")}
              </span>
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="mod-note"
              data-testid="resolve-report-note-input"
              rows={3}
              placeholder={
                isResolve
                  ? t("moderation.resolveDialog.resolve_placeholder")
                  : t("moderation.resolveDialog.dismiss_placeholder")
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
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              data-testid="resolve-report-submit-button"
              disabled={isSubmitting}
              variant={isResolve ? "default" : "destructive"}
            >
              {isSubmitting
                ? t("moderation.resolveDialog.processing")
                : isResolve
                  ? t("moderation.resolveDialog.resolve_submit")
                  : t("moderation.resolveDialog.dismiss_submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
