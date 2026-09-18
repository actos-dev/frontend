"use client";

import { AlertCircle, Ban as BanIcon } from "lucide-react";
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

interface BanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultUsername?: string;
}

export function BanDialog({ open, onOpenChange, defaultUsername = "" }: BanDialogProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(defaultUsername);
  const [duration, setDuration] = useState<"1d" | "3d" | "7d" | "30d" | "permanent">("permanent");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReset = () => {
    setUsername(defaultUsername);
    setDuration("permanent");
    setReason("");
    setErrorMessage(null);
  };

  const calculateExpiresAt = (dur: string): string | null => {
    if (dur === "permanent") return null;
    const days = Number.parseInt(dur, 10) || 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    const trimmedReason = reason.trim();

    if (!trimmedUsername) {
      setErrorMessage(t("moderation.banDialog.username_required"));
      return;
    }

    if (!trimmedReason) {
      setErrorMessage(t("moderation.banDialog.reason_required"));
      return;
    }

    setIsSubmitting(true);

    try {
      const expiresAt = calculateExpiresAt(duration);
      const res = await fetch("/api/mod/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          reason: trimmedReason,
          expiresAt,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("moderation.banDialog.request_error"));
      }

      toast.success(
        duration === "permanent"
          ? t("moderation.banDialog.permanent_success", { username: trimmedUsername })
          : t("moderation.banDialog.temporary_success", { username: trimmedUsername }),
      );

      handleReset();
      onOpenChange(false);
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
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <BanIcon className="w-5 h-5" />
              <span>{t("moderation.banDialog.title")}</span>
            </DialogTitle>
            <DialogDescription>{t("moderation.banDialog.description")}</DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div
              data-testid="ban-dialog-error"
              className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Kullanıcı Adı */}
          <div className="space-y-1.5">
            <Label htmlFor="ban-username" className="text-xs font-medium flex items-center gap-1">
              <span>{t("moderation.banDialog.username")}</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ban-username"
              data-testid="ban-username-input"
              placeholder={t("moderation.banDialog.username_placeholder")}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="text-xs"
            />
          </div>

          {/* Ban Süresi */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("moderation.banDialog.duration")}</Label>
            <div className="grid grid-cols-5 gap-1.5 text-xs">
              {(
                [
                  { id: "1d", labelKey: "moderation.resolveDialog.duration_1d" },
                  { id: "3d", labelKey: "moderation.resolveDialog.duration_3d" },
                  { id: "7d", labelKey: "moderation.resolveDialog.duration_7d" },
                  { id: "30d", labelKey: "moderation.resolveDialog.duration_30d" },
                  {
                    id: "permanent",
                    labelKey: "moderation.resolveDialog.duration_permanent",
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`ban-duration-${item.id}`}
                  onClick={() => setDuration(item.id)}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all text-xs font-medium ${
                    duration === item.id
                      ? "bg-destructive text-destructive-foreground border-destructive shadow-xs"
                      : "border-border/80 hover:bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Zorunlu Gerekçe */}
          <div className="space-y-1.5">
            <Label htmlFor="ban-reason" className="text-xs font-medium flex items-center gap-1">
              <span>{t("moderation.banDialog.reason")}</span>
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ban-reason"
              data-testid="ban-reason-input"
              rows={3}
              placeholder={t("moderation.banDialog.reason_placeholder")}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
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
              variant="destructive"
              size="sm"
              data-testid="confirm-ban-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("moderation.banDialog.submitting")
                : t("moderation.banDialog.title")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
