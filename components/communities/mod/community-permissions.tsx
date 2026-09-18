"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { COMMUNITY_PERMISSION_VOCABULARY } from "@/lib/communities/permissions";
import { useTranslation } from "@/lib/i18n";

export interface CommunityPermissionsProps {
  communityName: string;
  canGrant: boolean;
}

/**
 * Community-scoped permission grants. The vocabulary is the real one from the
 * backend; `PUT`/`DELETE /admin/permissions` with a `community` scope is the
 * only write. A community moderator holding `role.grant` scoped to this
 * community reaches this screen; the API enforces the scope.
 */
export function CommunityPermissions({ communityName, canGrant }: CommunityPermissionsProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [permission, setPermission] = useState<string>(COMMUNITY_PERMISSION_VOCABULARY[0]);
  const [busy, setBusy] = useState<"grant" | "revoke" | null>(null);

  if (!canGrant) {
    return null;
  }

  const submit = async (mode: "grant" | "revoke") => {
    const target = username.trim().replace(/^@/, "");
    if (!target) {
      toast.error(t("moderation.permissions.username_required"));
      return;
    }
    setBusy(mode);
    try {
      const res = await fetch("/api/mod/permissions", {
        method: mode === "grant" ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target, permission, community: communityName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.detail || t("communities.mod.permissions.error"));
        return;
      }
      toast.success(
        mode === "grant"
          ? t("communities.mod.permissions.success_granted")
          : t("communities.mod.permissions.success_revoked"),
      );
      setUsername("");
    } catch {
      toast.error(t("communities.mod.permissions.error"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="community-permissions">
      <div>
        <h2 className="text-sm font-semibold text-fg">{t("communities.mod.permissions.title")}</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          {t("communities.mod.permissions.description")}
        </p>
      </div>

      <div className="max-w-md space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="permission-username" className="text-xs font-medium">
            {t("communities.mod.permissions.username_label")}
          </Label>
          <Input
            id="permission-username"
            data-testid="permission-username-input"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            autoComplete="off"
            placeholder={t("communities.mod.permissions.username_placeholder")}
            className="font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="permission-select" className="text-xs font-medium">
            {t("communities.mod.permissions.permission_label")}
          </Label>
          <select
            id="permission-select"
            data-testid="permission-select"
            value={permission}
            onChange={(event) => setPermission(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {COMMUNITY_PERMISSION_VOCABULARY.map((value) => (
              <option key={value} value={value}>
                {t(`communities.mod.permissions.labels.${value.replace(/\./g, "_")}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            data-testid="permission-grant-button"
            disabled={busy !== null || !username.trim()}
            onClick={() => submit("grant")}
          >
            {busy === "grant" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{t("communities.mod.permissions.grant")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="permission-revoke-button"
            disabled={busy !== null || !username.trim()}
            onClick={() => submit("revoke")}
          >
            {busy === "revoke" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{t("communities.mod.permissions.revoke")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
