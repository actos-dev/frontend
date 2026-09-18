"use client";

import type { Community } from "actos";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";

export interface SettingsFormProps {
  community: Pick<Community, "name" | "description" | "visibility">;
  canEdit: boolean;
  canClose: boolean;
  isOwner: boolean;
}

/**
 * Community settings. The visibility move is one-way (public to private), so
 * it is presented as such with an explicit warning; a private community has
 * no control to go back. Closing requires typing the exact community name.
 */
export function SettingsForm({ community, canEdit, canClose, isOwner }: SettingsFormProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const [description, setDescription] = useState(community.description ?? "");
  const [savingDescription, setSavingDescription] = useState(false);

  const [visibility, setVisibility] = useState(community.visibility);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [successor, setSuccessor] = useState("");
  const [savingSuccessor, setSavingSuccessor] = useState(false);

  const [closeConfirm, setCloseConfirm] = useState("");
  const [closing, setClosing] = useState(false);

  const saveDescription = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim()) {
      toast.error(t("communities.create_form.description_hint"));
      return;
    }
    setSavingDescription(true);
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(community.name)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.detail || t("communities.mod.settings.save_failed"));
        return;
      }
      toast.success(t("communities.mod.settings.saved"));
      router.refresh();
    } catch {
      toast.error(t("communities.mod.settings.save_failed"));
    } finally {
      setSavingDescription(false);
    }
  };

  const makePrivate = async () => {
    setSavingVisibility(true);
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(community.name)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Visibility-only patch: `description` is omitted on purpose.
        body: JSON.stringify({ visibility: "private" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.detail || t("communities.mod.settings.visibility_failed"));
        return;
      }
      setVisibility("private");
      toast.success(t("communities.mod.settings.visibility_saved"));
      router.refresh();
    } catch {
      toast.error(t("communities.mod.settings.visibility_failed"));
    } finally {
      setSavingVisibility(false);
    }
  };

  const saveSuccessor = async (event: React.FormEvent) => {
    event.preventDefault();
    const target = successor.trim().replace(/^@/, "");
    if (!target) return;
    setSavingSuccessor(true);
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(community.name)}/successor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.detail || t("communities.mod.settings.successor_failed"));
        return;
      }
      toast.success(t("communities.mod.settings.successor_saved"));
      setSuccessor("");
    } catch {
      toast.error(t("communities.mod.settings.successor_failed"));
    } finally {
      setSavingSuccessor(false);
    }
  };

  const handleClose = async () => {
    if (closeConfirm.trim() !== community.name) {
      toast.error(t("communities.mod.settings.close_mismatch"));
      return;
    }
    setClosing(true);
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(community.name)}/close`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.detail || t("communities.mod.settings.close_failed"));
        return;
      }
      toast.success(t("communities.mod.settings.close_success"));
      router.push("/c");
      router.refresh();
    } catch {
      toast.error(t("communities.mod.settings.close_failed"));
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="community-settings">
      <div>
        <h2 className="text-sm font-semibold text-fg">{t("communities.mod.settings.title")}</h2>
        <p className="mt-0.5 text-xs text-fg-muted">{t("communities.mod.settings.description")}</p>
      </div>

      {canEdit ? (
        <form onSubmit={saveDescription} className="space-y-3">
          <Label className="text-xs font-medium">
            {t("communities.mod.settings.description_label")}
          </Label>
          <MarkdownEditor value={description} onChange={setDescription} compact minRows={6} />
          <Button
            type="submit"
            size="sm"
            data-testid="save-description-button"
            disabled={savingDescription}
          >
            {savingDescription ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{t("communities.mod.settings.save")}</span>
          </Button>
        </form>
      ) : null}

      <section className="space-y-2 border-t border-border pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          {t("communities.mod.settings.visibility_title")}
        </h3>
        <p className="text-sm text-fg-muted" data-testid="settings-visibility-current">
          {t("communities.mod.settings.visibility_current", {
            visibility:
              visibility === "private" ? t("communities.private") : t("communities.public"),
          })}
        </p>
        {canEdit && visibility === "public" ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-danger" data-testid="visibility-warning">
              {t("communities.mod.settings.private_warning")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="make-private-button"
              disabled={savingVisibility}
              onClick={makePrivate}
            >
              {savingVisibility ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              <span>{t("communities.mod.settings.make_private")}</span>
            </Button>
          </div>
        ) : null}
      </section>

      {isOwner ? (
        <form onSubmit={saveSuccessor} className="space-y-3 border-t border-border pt-5">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              {t("communities.mod.settings.successor_title")}
            </h3>
            <p className="mt-1 text-xs text-fg-muted">
              {t("communities.mod.settings.successor_description")}
            </p>
          </div>
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="successor-username" className="text-xs font-medium">
              {t("communities.mod.settings.successor_label")}
            </Label>
            <Input
              id="successor-username"
              data-testid="successor-username-input"
              value={successor}
              onChange={(event) => setSuccessor(event.target.value.toLowerCase())}
              autoComplete="off"
              placeholder={t("communities.mod.settings.successor_placeholder")}
              className="font-mono"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            data-testid="successor-submit"
            disabled={savingSuccessor || !successor.trim()}
          >
            {savingSuccessor ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{t("communities.mod.settings.successor_submit")}</span>
          </Button>
        </form>
      ) : null}

      {canClose ? (
        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-danger">
            {t("communities.mod.settings.close_title")}
          </h3>
          <p className="text-xs text-fg-muted">{t("communities.mod.settings.close_warning")}</p>
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="close-confirm" className="text-xs font-medium">
              {t("communities.mod.settings.close_confirm_label")}
            </Label>
            <Input
              id="close-confirm"
              data-testid="close-confirm-input"
              value={closeConfirm}
              onChange={(event) => setCloseConfirm(event.target.value)}
              autoComplete="off"
              placeholder={community.name}
              className="font-mono"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            data-testid="close-community-button"
            disabled={closing || closeConfirm.trim() !== community.name}
            onClick={handleClose}
          >
            {closing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            <span>{t("communities.mod.settings.close_button")}</span>
          </Button>
        </section>
      ) : null}
    </div>
  );
}
