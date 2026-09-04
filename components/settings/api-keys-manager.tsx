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
  const { t } = useTranslation();

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
        toast.error(data.detail || data.title || "API anahtarı oluşturulamadı.");
        return;
      }

      const { key, apiKey } = data.data;
      setKeys((prev) => [key, ...prev]);
      setGeneratedKey(apiKey);
      toast.success("API anahtarı başarıyla oluşturuldu.");
    } catch {
      toast.error("Bağlantı hatası: API anahtarı oluşturulamadı.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopySecret = async () => {
    if (!generatedKey) return;

    try {
      await navigator.clipboard.writeText(generatedKey);
      setHasCopied(true);
      toast.success(t("settings.keys.modal.copied") || "Anahtar panoya kopyalandı!");
      setTimeout(() => setHasCopied(false), 3000);
    } catch {
      toast.error("Panoya kopyalanamadı.");
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
        toast.error(data.detail || data.title || "Anahtar iptal edilemedi.");
        return;
      }

      setKeys((prev) =>
        prev.map((k) =>
          k.id === revokeTarget.id ? { ...k, revokedAt: new Date().toISOString() } : k,
        ),
      );

      toast.success(
        t("settings.keys.revoke_modal.success") || "API anahtarı başarıyla iptal edildi.",
      );
      setRevokeTarget(null);
    } catch {
      toast.error("Bağlantı hatası: Anahtar iptal edilemedi.");
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
          <h2 className="text-base font-semibold text-foreground">
            {t("settings.keys.title") || "API Anahtarları"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
            {t("settings.keys.desc") ||
              "API anahtarları, Actos API ve CLI üzerinden hesabınıza programatik erişim sağlar."}
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenCreateModal}
          data-testid="create-key-button"
          className="cursor-pointer gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>{t("settings.keys.create_button") || "Yeni Anahtar Oluştur"}</span>
        </Button>
      </div>

      {/* Anahtarlar Listesi */}
      {activeKeys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto text-muted-foreground">
            <Key className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {t("settings.keys.empty") || "Aktif bir API anahtarınız bulunmuyor."}
            </p>
            <p className="text-xs text-muted-foreground">
              Scriptleriniz veya botlarınız için yeni bir anahtar üretebilirsiniz.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">{t("settings.keys.table.name") || "İsim"}</th>
                  <th className="py-3 px-4">{t("settings.keys.table.prefix") || "Ön Ek"}</th>
                  <th className="py-3 px-4">{t("settings.keys.table.created") || "Oluşturulma"}</th>
                  <th className="py-3 px-4">
                    {t("settings.keys.table.last_used") || "Son Kullanım"}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {t("settings.keys.table.actions") || "İşlem"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeKeys.map((key) => {
                  const keyPrefix = `actos_${key.id.slice(0, 8)}...`;
                  const createdStr = formatRelativeTime(key.createdAt) || "Bilinmiyor";
                  const lastUsedStr = key.lastUsedAt
                    ? formatRelativeTime(key.lastUsedAt)
                    : t("settings.keys.table.never_used") || "Henüz kullanılmadı";

                  return (
                    <tr
                      key={key.id}
                      data-testid={`key-row-${key.id}`}
                      className="hover:bg-surface-2/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{key.label || "İsimsiz Anahtar"}</span>
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
                          <span>{t("settings.keys.table.revoke") || "İptal Et"}</span>
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
                ? t("settings.keys.modal.success_title") || "API Anahtarınız Hazır"
                : t("settings.keys.modal.title") || "Yeni API Anahtarı"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {generatedKey
                ? "Aşağıdaki anahtarı hemen kopyalayın."
                : "Yeni bir API anahtarı için isteğe bağlı bir etiket girin."}
            </DialogDescription>
          </DialogHeader>

          {/* Durum 1: Henüz anahtar üretilmedi (Form aşaması) */}
          {!generatedKey ? (
            <form onSubmit={handleCreateKey} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label htmlFor="key-label-input" className="text-xs font-semibold text-foreground">
                  {t("settings.keys.modal.label_input") || "Anahtar Adı / Etiketi (Opsiyonel)"}
                </label>
                <Input
                  id="key-label-input"
                  data-testid="key-label-input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={
                    t("settings.keys.modal.label_placeholder") || "Örn: CLI, MacBook Pro, Bot"
                  }
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
                  Vazgeç
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
                      ? t("settings.keys.modal.creating") || "Oluşturuluyor..."
                      : t("settings.keys.modal.create_submit") || "Oluştur"}
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
                  <span>Önemli Güvenlik Uyarısı</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {t("settings.keys.modal.warning") ||
                    "Bu anahtarı bir daha göremeyeceksiniz, lütfen güvenli bir yere kaydedin."}
                </p>
              </div>

              {/* Anahtarın Plaintext Görüntülenmesi */}
              <div className="space-y-1.5">
                <label
                  htmlFor="revealed-api-key"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Üretilen API Anahtarı
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
                        <span>Kopyalandı</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t("settings.keys.modal.copy_button") || "Kopyala"}</span>
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
                  {t("settings.keys.modal.done_button") || "Kaydettim ve Kapat"}
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
              <DialogTitle>
                {t("settings.keys.revoke_modal.title") || "Anahtarı İptal Et"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t("settings.keys.revoke_modal.desc") ||
                "Bu anahtarı iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz ve anahtarı kullanan scriptler erişimini anında kaybeder."}
            </DialogDescription>
          </DialogHeader>

          {revokeTarget && (
            <div className="p-3 rounded-xl bg-surface-2 border border-border text-xs space-y-1">
              <div className="font-semibold text-foreground">
                {revokeTarget.label || "İsimsiz Anahtar"}
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
              Vazgeç
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
                  ? "İptal ediliyor..."
                  : t("settings.keys.revoke_modal.confirm") || "Evet, İptal Et"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
