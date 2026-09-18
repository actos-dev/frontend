"use client";

import { AlertCircle, Shield, ShieldAlert, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";

export function RolesManager() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"moderator" | "admin" | "revoke">("moderator");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage(t("moderation.roles.username_required"));
      return;
    }

    setIsSubmitting(true);

    try {
      const targetRole = role === "revoke" ? null : role;

      const res = await fetch("/api/mod/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          role: targetRole,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("moderation.roles.request_error"));
      }

      toast.success(
        targetRole
          ? t("moderation.roles.assigned_success", {
              username: trimmedUsername,
              role: targetRole,
            })
          : t("moderation.roles.revoked_success", { username: trimmedUsername }),
      );

      setUsername("");
      setRole("moderator");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("moderation.resolveDialog.server_error");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h2 className="text-base font-bold text-foreground">{t("moderation.roles.title")}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t("moderation.roles.description")}</p>
      </div>

      {/* Rol Bilgi Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-surface-2 border border-border/80 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>{t("moderation.roles.moderator_title")}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {t("moderation.roles.moderator_description")}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-2 border border-border/80 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <span>{t("moderation.roles.admin_title")}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {t("moderation.roles.admin_description")}
          </p>
        </div>
      </div>

      {/* Rol Atama Formu */}
      <form
        onSubmit={handleSubmit}
        className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-5"
        data-testid="role-assignment-form"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span>{t("moderation.roles.form_title")}</span>
          </h3>
          <p className="text-xs text-muted-foreground">{t("moderation.roles.form_description")}</p>
        </div>

        {errorMessage && (
          <div
            data-testid="role-form-error"
            className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="target-username" className="text-xs font-medium">
            {t("moderation.roles.username")}
          </Label>
          <Input
            id="target-username"
            data-testid="role-target-username-input"
            placeholder={t("moderation.roles.username_placeholder")}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            className="text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">{t("moderation.roles.action_type")}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="role-option-moderator"
              onClick={() => setRole("moderator")}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs text-left transition-all ${
                role === "moderator"
                  ? "border-primary bg-primary/10 text-foreground font-semibold shadow-2xs"
                  : "border-border/80 hover:bg-surface-2 text-muted-foreground"
              }`}
            >
              <UserCheck className="w-4 h-4 text-primary shrink-0" />
              <div>
                <div>{t("moderation.roles.assign_moderator")}</div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  {t("moderation.roles.assign_moderator_description")}
                </div>
              </div>
            </button>

            <button
              type="button"
              data-testid="role-option-revoke"
              onClick={() => setRole("revoke")}
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs text-left transition-all ${
                role === "revoke"
                  ? "border-destructive bg-destructive/10 text-destructive font-semibold shadow-2xs"
                  : "border-border/80 hover:bg-surface-2 text-muted-foreground"
              }`}
            >
              <UserX className="w-4 h-4 text-destructive shrink-0" />
              <div>
                <div>{t("moderation.roles.revoke")}</div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  {t("moderation.roles.revoke_description")}
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            size="sm"
            data-testid="submit-role-assignment-button"
            disabled={isSubmitting}
            className="gap-1.5 rounded-xl font-semibold text-xs"
            variant={role === "revoke" ? "destructive" : "default"}
          >
            {isSubmitting
              ? t("moderation.roles.processing")
              : role === "revoke"
                ? t("moderation.roles.revoke_submit")
                : t("moderation.roles.assign_submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
