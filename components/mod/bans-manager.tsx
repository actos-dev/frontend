"use client";

import { AlertTriangle, Plus, ShieldCheck, UserX } from "lucide-react";
import { useState } from "react";
import { BanDialog } from "@/components/mod/ban-dialog";
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
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";

export function BansManager() {
  const { t } = useTranslation();
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [community, setCommunity] = useState("");
  const [unbanTarget, setUnbanTarget] = useState<string | null>(null);
  const [isUnbanning, setIsUnbanning] = useState(false);

  const handleConfirmUnban = async () => {
    if (!unbanTarget) return;
    setIsUnbanning(true);

    try {
      // A community-scoped unban passes the community as a query parameter;
      // an empty scope means the platform-wide ban (ROADMAP §7.3 item 8).
      const target = community.trim();
      const url = target
        ? `/api/mod/bans/${encodeURIComponent(unbanTarget)}?community=${encodeURIComponent(target)}`
        : `/api/mod/bans/${encodeURIComponent(unbanTarget)}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("moderation.bans.remove_error"));
      }

      toast.success(t("moderation.bans.remove_success", { username: unbanTarget }));
      setUsername("");
      setCommunity("");
      setUnbanTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("moderation.resolveDialog.server_error");
      toast.error(msg);
    } finally {
      setIsUnbanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("moderation.bans.title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("moderation.bans.description")}</p>
        </div>

        <Button
          type="button"
          size="sm"
          data-testid="open-add-ban-dialog-button"
          onClick={() => setBanDialogOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>{t("moderation.bans.add")}</span>
        </Button>
      </div>

      <div
        role="status"
        data-testid="ban-list-unsupported"
        className="flex gap-3 border border-border bg-surface-2/50 p-4"
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t("moderation.bans.list_unavailable")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("moderation.bans.list_unavailable_description")}
          </p>
        </div>
      </div>

      <form
        className="max-w-md space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const target = username.trim().replace(/^@/, "");
          if (target) setUnbanTarget(target);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="ban-remove-username">{t("moderation.bans.remove_label")}</Label>
          <Input
            id="ban-remove-username"
            data-testid="ban-remove-username-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
            placeholder={t("moderation.bans.username_placeholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ban-remove-community">{t("moderation.bans.community_label")}</Label>
          <Input
            id="ban-remove-community"
            data-testid="ban-remove-community-input"
            value={community}
            onChange={(event) => setCommunity(event.target.value.toLowerCase())}
            autoComplete="off"
            placeholder={t("moderation.bans.community_placeholder")}
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">{t("moderation.bans.community_hint")}</p>
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={!username.trim()}>
          <UserX className="mr-1.5 h-4 w-4" />
          {t("moderation.bans.remove")}
        </Button>
      </form>

      <BanDialog open={banDialogOpen} onOpenChange={setBanDialogOpen} />

      <Dialog
        open={Boolean(unbanTarget)}
        onOpenChange={(open) => {
          if (!open) setUnbanTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span>{t("moderation.bans.remove")}</span>
            </DialogTitle>
            <DialogDescription>
              {t("moderation.bans.remove_description", { username: unbanTarget || "" })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnbanTarget(null)}
              disabled={isUnbanning}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-testid="confirm-unban-button"
              disabled={isUnbanning}
              onClick={handleConfirmUnban}
            >
              {isUnbanning ? t("moderation.bans.removing") : t("moderation.bans.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
