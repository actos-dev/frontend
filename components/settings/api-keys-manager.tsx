"use client";

import type { ApiKey } from "actos";
import { AlertTriangle, Check, Copy, Key, Loader2, Plus, Trash2 } from "lucide-react";
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
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/utils";

export interface ApiKeysManagerProps {
  initialKeys: ApiKey[];
}

/**
 * API Keys management interface (Plan §Faz 11).
 *
 * CRITICAL RULE:
 * Newly generated keys are displayed ONLY ONCE in plaintext with a copy button
 * and an unmistakable "save it now, you'll never see it again" warning.
 */
export function ApiKeysManager({ initialKeys }: ApiKeysManagerProps) {
  const { locale, t } = useTranslation();

  const [keys, setKeys] = useState<ApiKey[]>(initialKeys || []);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // New generated secret state (revealed ONLY ONCE)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Revoke key confirmation state
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleOpenCreateModal = () => {
    setLabel("");
    setGeneratedKey(null);
    setHasCopied(false);
    setCreateModalOpen(true);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    setIsCreating(true);

    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || t("settings.keys.create_error"));
        return;
      }

      const { key, apiKey } = data.data;
      setKeys((prev) => [key, ...prev]);
      setGeneratedKey(apiKey);
      toast.success(t("settings.keys.created"));
    } catch {
      toast.error(t("settings.keys.create_network_error"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopySecret = async () => {
    if (!generatedKey) return;

    try {
      await navigator.clipboard.writeText(generatedKey);
      setHasCopied(true);
      toast.success(t("settings.keys.modal.copied"));
      setTimeout(() => setHasCopied(false), 3000);
    } catch {
      toast.error(t("settings.keys.copy_error"));
    }
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setGeneratedKey(null);
    setHasCopied(false);
    setLabel("");
  };

  const handleRevokeKey = async () => {
    if (!revokeTarget || isRevoking) return;

    setIsRevoking(true);

    try {
      const res = await fetch(`/api/settings/keys/${encodeURIComponent(revokeTarget.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || t("settings.keys.revoke_modal.error"));
        return;
      }

      setKeys((prev) =>
        prev.map((k) =>
          k.id === revokeTarget.id ? { ...k, revokedAt: new Date().toISOString() } : k,
        ),
      );

      toast.success(t("settings.keys.revoke_modal.success"));
      setRevokeTarget(null);
    } catch {
      toast.error(t("settings.keys.revoke_modal.network_error"));
    } finally {
      setIsRevoking(false);
    }
  };

  const activeKeys = keys.filter((k) => !k.revokedAt);

  return (
    <div className="space-y-6">
      {/* Üst Bilgi ve Eylem Barı */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap pb-2 border-b border-border/60">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("settings.keys.title")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{t("settings.keys.desc")}</p>
        </div>

        <Button
          type="button"
          onClick={handleOpenCreateModal}
          data-testid="create-key-button"
          className="cursor-pointer gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{t("settings.keys.create_button")}</span>
        </Button>
      </div>

      {/* Anahtarlar Listesi */}
      {activeKeys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto text-muted-foreground">
            <Key className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{t("settings.keys.empty")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.keys.empty_desc")}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">{t("settings.keys.table.name")}</th>
                  <th className="py-3 px-4">{t("settings.keys.table.prefix")}</th>
                  <th className="py-3 px-4">{t("settings.keys.table.created")}</th>
                  <th className="py-3 px-4">{t("settings.keys.table.last_used")}</th>
                  <th className="py-3 px-4 text-right">{t("settings.keys.table.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeKeys.map((key) => {
                  const keyPrefix = `actos_${key.id.slice(0, 8)}...`;
                  const createdStr =
                    formatRelativeTime(key.createdAt, locale) || t("settings.keys.unknown_date");
                  const lastUsedStr = key.lastUsedAt
                    ? formatRelativeTime(key.lastUsedAt, locale)
                    : t("settings.keys.table.never_used");

                  return (
                    <tr
                      key={key.id}
                      data-testid={`key-row-${key.id}`}
                      className="hover:bg-surface-2/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{key.label || t("settings.keys.unnamed")}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">{keyPrefix}</td>
                      <td className="py-3.5 px-4 text-muted-foreground" title={key.createdAt}>
                        {createdStr}
                      </td>
                      <td
                        className="py-3.5 px-4 text-muted-foreground"
                        title={key.lastUsedAt || undefined}
                      >
                        {lastUsedStr}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevokeTarget(key)}
                          data-testid={`revoke-key-${key.id}`}
                          className="text-destructive hover:bg-destructive/10 cursor-pointer text-xs h-8 px-2.5"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>{t("settings.keys.table.revoke")}</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Yeni Anahtar Oluşturma Modalı (Radix Dialog) */}
      <Dialog
        open={createModalOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseCreateModal();
          else setCreateModalOpen(true);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {generatedKey
                ? t("settings.keys.modal.success_title")
                : t("settings.keys.modal.title")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {generatedKey
                ? t("settings.keys.modal.success_description")
                : t("settings.keys.modal.description")}
            </DialogDescription>
          </DialogHeader>

          {/* Durum 1: Henüz anahtar üretilmedi (Form aşaması) */}
          {!generatedKey ? (
            <form onSubmit={handleCreateKey} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label htmlFor="key-label-input" className="text-xs font-semibold text-foreground">
                  {t("settings.keys.modal.label_input")}
                </label>
                <Input
                  id="key-label-input"
                  data-testid="key-label-input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t("settings.keys.modal.label_placeholder")}
                  maxLength={64}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseCreateModal}
                  disabled={isCreating}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  data-testid="submit-create-key"
                  className="cursor-pointer gap-2"
                >
                  {isCreating && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
                  )}
                  <span>
                    {isCreating
                      ? t("settings.keys.modal.creating")
                      : t("settings.keys.modal.create_submit")}
                  </span>
                </Button>
              </DialogFooter>
            </form>
          ) : (
            /* Durum 2: Anahtar üretildi (YALNIZCA BİR KEZ GÖSTERİM & UYARI) */
            <div className="space-y-4 py-2" data-testid="key-revealed-view">
              {/* Kritik Uyarı Kutusu */}
              <div
                className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-warning-foreground space-y-1"
                data-testid="key-warning"
              >
                <div className="flex items-center gap-2 font-bold text-sm text-warning">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{t("settings.keys.modal.security_title")}</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {t("settings.keys.modal.warning")}
                </p>
              </div>

              {/* Anahtarın Plaintext Görüntülenmesi */}
              <div className="space-y-1.5">
                <label
                  htmlFor="revealed-api-key"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  {t("settings.keys.modal.generated_label")}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="revealed-api-key"
                    readOnly
                    value={generatedKey}
                    data-testid="revealed-api-key"
                    className="font-mono text-xs bg-surface-2 select-all tracking-wide"
                  />
                  <Button
                    type="button"
                    variant={hasCopied ? "default" : "secondary"}
                    onClick={handleCopySecret}
                    data-testid="copy-key-button"
                    className="cursor-pointer shrink-0 gap-1.5"
                  >
                    {hasCopied ? (
                      <>
                        <Check className="w-4 h-4 text-success" />
                        <span>{t("settings.keys.modal.copied_label")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t("settings.keys.modal.copy_button")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  onClick={handleCloseCreateModal}
                  data-testid="done-create-key"
                  className="w-full cursor-pointer"
                >
                  {t("settings.keys.modal.done_button")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Anahtar İptal Et Onay Modalı */}
      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle>{t("settings.keys.revoke_modal.title")}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.keys.revoke_modal.desc")}
            </DialogDescription>
          </DialogHeader>

          {revokeTarget && (
            <div className="p-3 rounded-xl bg-surface-2 border border-border text-xs space-y-1">
              <div className="font-semibold text-foreground">
                {revokeTarget.label || t("settings.keys.unnamed")}
              </div>
              <div className="font-mono text-muted-foreground">
                actos_{revokeTarget.id.slice(0, 8)}...
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              disabled={isRevoking}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRevokeKey}
              disabled={isRevoking}
              data-testid="confirm-revoke-key"
              className="cursor-pointer gap-2"
            >
              {isRevoking && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>
                {isRevoking
                  ? t("settings.keys.revoke_modal.revoking")
                  : t("settings.keys.revoke_modal.confirm")}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
