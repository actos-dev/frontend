"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileText,
  KeyRound,
  Loader2,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
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
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { downloadRecoveryFile, generateRegeneratedCodesFileContent } from "@/lib/recovery-file";

export interface RecoveryCodesManagerProps {
  username: string;
}

/**
 * Recovery Codes rotation management interface (Plan §Faz 11).
 *
 * CRITICAL RULE:
 * Explicit catastrophic warning BEFORE regenerating:
 * "Yeni kurtarma kodları ürettiğinizde, mevcut tüm kurtarma kodlarınız ANINDA geçersiz olacaktır."
 *
 * Displays 10 newly generated recovery codes with primary action: Download .txt.
 */
export function RecoveryCodesManager({ username }: RecoveryCodesManagerProps) {
  const { t } = useTranslation();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // 10 new recovery codes state
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleConfirmRegenerate = async () => {
    setIsRegenerating(true);

    try {
      const res = await fetch("/api/settings/recovery", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || t("settings.recovery.regenerate_error"));
        return;
      }

      const codes = (data.data?.recoveryCodes || []) as string[];
      setNewCodes(codes);
      setConfirmModalOpen(false);
      setHasCopied(false);
      setHasDownloaded(false);
      toast.success(t("settings.recovery.regenerated"));
    } catch {
      toast.error(t("settings.recovery.regenerate_network_error"));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!newCodes || newCodes.length === 0) return;

    const fileContent = generateRegeneratedCodesFileContent({
      username,
      recoveryCodes: newCodes,
    });

    downloadRecoveryFile(username, fileContent);
    setHasDownloaded(true);
    toast.success(t("settings.recovery.modal.downloaded"));
  };

  const handleCopyAll = async () => {
    if (!newCodes || newCodes.length === 0) return;

    try {
      const formatted = newCodes.map((c, i) => `${i + 1}. ${c}`).join("\n");
      await navigator.clipboard.writeText(formatted);
      setHasCopied(true);
      toast.success(t("settings.recovery.modal.copied"));
      setTimeout(() => setHasCopied(false), 3000);
    } catch {
      toast.error(t("settings.recovery.copy_error"));
    }
  };

  return (
    <div className="space-y-8">
      {/* Durum 1: Kodlar henüz yenilenmedi — Bilgilendirme ve Yenileme Butonu */}
      {!newCodes ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  {t("settings.recovery.title")}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {t("settings.recovery.desc")}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-2/40 p-4 text-xs text-muted-foreground leading-relaxed space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" />
                <span>{t("settings.recovery.how_title")}</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>{t("settings.recovery.how_single_use")}</li>
                <li>{t("settings.recovery.how_critical_actions")}</li>
                <li>{t("settings.recovery.how_consumed")}</li>
                <li>{t("settings.recovery.how_regenerate")}</li>
              </ul>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmModalOpen(true)}
                data-testid="regenerate-codes-button"
                className="cursor-pointer gap-2 border-border/90 hover:border-primary shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t("settings.recovery.regenerate_button")}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Durum 2: 10 Yeni Kod Üretildi — Tam Ekran / Genişletilmiş Görünüm */
        <div
          className="rounded-2xl border-2 border-primary/40 bg-card p-6 sm:p-8 shadow-md space-y-6"
          data-testid="regenerated-codes-view"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center text-success">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {t("settings.recovery.modal.success_title")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("settings.recovery.modal.success_description")}
              </p>
            </div>
          </div>

          {/* 10 Kodun Grid Görünümü */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-xl bg-surface-2 border border-border"
            data-testid="recovery-codes-grid"
          >
            {newCodes.map((code, index) => (
              <div
                key={code}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-card border border-border/70 font-mono text-sm tracking-wider font-semibold text-foreground shadow-2xs"
              >
                <span className="text-xs text-muted-foreground font-mono select-none">
                  {String(index + 1).padStart(2, "0")}.
                </span>
                <span className="select-all">{code}</span>
              </div>
            ))}
          </div>

          {/* Eylem Butonları: BİRİNCİL = .txt İndir, İKİNCİL = Kopyala */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Button
              type="button"
              size="lg"
              onClick={handleDownloadTxt}
              data-testid="download-codes-button"
              className="cursor-pointer gap-2 font-semibold shadow-xs flex-1"
            >
              {hasDownloaded ? (
                <>
                  <Check className="w-4 h-4 text-primary-foreground" />
                  <span>{t("settings.recovery.modal.download_again")}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{t("settings.recovery.modal.download_button")}</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCopyAll}
              data-testid="copy-codes-button"
              className="cursor-pointer gap-2 border-border/80 hover:bg-surface-2 flex-1"
            >
              {hasCopied ? (
                <>
                  <Check className="w-4 h-4 text-success" />
                  <span>{t("settings.recovery.modal.copied_label")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t("settings.recovery.modal.copy_all")}</span>
                </>
              )}
            </Button>
          </div>

          <div className="pt-2 border-t border-border/60 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNewCodes(null)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {t("settings.recovery.modal.saved_done")}
            </Button>
          </div>
        </div>
      )}

      {/* Yenileme Öncesi Açık Felaket Uyarısı Modalı */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle>{t("settings.recovery.modal.title")}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.recovery.modal.description")}
            </DialogDescription>
          </DialogHeader>

          {/* AÇIK FELAKET UYARISI (Kural 4) */}
          <div
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive space-y-1.5"
            data-testid="regenerate-warning"
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t("settings.recovery.modal.warning_title")}</span>
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              {t("settings.recovery.warning")}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              disabled={isRegenerating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRegenerate}
              disabled={isRegenerating}
              data-testid="confirm-regenerate-button"
              className="cursor-pointer gap-2"
            >
              {isRegenerating && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>
                {isRegenerating
                  ? t("settings.recovery.modal.regenerating")
                  : t("settings.recovery.modal.confirm")}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
