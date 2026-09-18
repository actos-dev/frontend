"use client";

import { AlertCircle, Shield, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { GLOBAL_PERMISSION_VOCABULARY } from "@/lib/communities/permissions";
import { useTranslation } from "@/lib/i18n";

/**
 * The `/mod/roles` screen, reworked for 0.3.0: roles no longer exist, so this
 * grants and revokes the real global permission vocabulary through
 * `PUT`/`DELETE /admin/permissions` (no `community` scope). The screen is only
 * reachable by holders of a global `role.grant`.
 */
export function GlobalPermissionsManager() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [permission, setPermission] = useState<string>(GLOBAL_PERMISSION_VOCABULARY[0]);
  const [busy, setBusy] = useState<"grant" | "revoke" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (mode: "grant" | "revoke") => {
    setErrorMessage(null);
    const target = username.trim().replace(/^@/, "");
    if (!target) {
      setErrorMessage(t("moderation.permissions.username_required"));
      return;
    }
    setBusy(mode);
    try {
      const res = await fetch("/api/mod/permissions", {
        method: mode === "grant" ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target, permission }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.detail || t("moderation.permissions.request_error");
        setErrorMessage(message);
        toast.error(message);
        return;
      }
      toast.success(
        mode === "grant"
          ? t("moderation.permissions.granted_success", {
              username: target,
              permission: t(`moderation.permissions.labels.${permission.replace(/\./g, "_")}`),
            })
          : t("moderation.permissions.revoked_success", {
              username: target,
              permission: t(`moderation.permissions.labels.${permission.replace(/\./g, "_")}`),
            }),
      );
      setUsername("");
    } catch {
      const message = t("moderation.permissions.request_error");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-fg">
          <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("moderation.permissions.title")}
        </h2>
        <p className="mt-1 text-xs text-fg-muted">{t("moderation.permissions.description")}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit("grant");
        }}
        data-testid="global-permission-form"
        className="space-y-5 rounded-2xl border border-border/80 bg-card p-5 shadow-xs"
      >
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("moderation.permissions.form_title")}
          </h3>
          <p className="text-xs text-fg-muted">{t("moderation.permissions.form_description")}</p>
        </div>

        {errorMessage ? (
          <div
            data-testid="global-permission-error"
            className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs font-medium text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="global-permission-username" className="text-xs font-medium">
            {t("moderation.permissions.username")}
          </Label>
          <Input
            id="global-permission-username"
            data-testid="global-permission-username-input"
            placeholder={t("moderation.permissions.username_placeholder")}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            className="text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="global-permission-select" className="text-xs font-medium">
            {t("moderation.permissions.permission_label")}
          </Label>
          <select
            id="global-permission-select"
            data-testid="global-permission-select"
            value={permission}
            onChange={(event) => setPermission(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {GLOBAL_PERMISSION_VOCABULARY.map((value) => (
              <option key={value} value={value}>
                {t(`moderation.permissions.labels.${value.replace(/\./g, "_")}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            data-testid="global-permission-revoke"
            disabled={busy !== null}
            onClick={() => submit("revoke")}
          >
            {t("moderation.permissions.revoke")}
          </Button>
          <Button
            type="submit"
            size="sm"
            data-testid="global-permission-grant"
            disabled={busy !== null}
          >
            {busy === "grant"
              ? t("moderation.permissions.processing")
              : t("moderation.permissions.grant")}
          </Button>
        </div>
      </form>
    </div>
  );
}
