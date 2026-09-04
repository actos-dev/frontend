"use client";

import type { Ban } from "actos";
import { AlertTriangle, Calendar, Clock, Plus, ShieldCheck, UserX } from "lucide-react";
import { useState } from "react";
import { BanDialog } from "@/components/mod/ban-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";

interface BansManagerProps {
  initialBans?: Ban[];
}

export function BansManager({ initialBans = [] }: BansManagerProps) {
  const [bans, setBans] = useState<Ban[]>(initialBans);
  const [banDialogOpen, setBanDialogOpen] = useState(false);

  // Unban confirmation dialog state
  const [unbanTarget, setUnbanTarget] = useState<string | null>(null);
  const [isUnbanning, setIsUnbanning] = useState(false);

  const handleBanCreated = (newBan: Ban) => {
    setBans((prev) => [newBan, ...prev.filter((b) => b.username !== newBan.username)]);
  };

  const handleConfirmUnban = async () => {
    if (!unbanTarget) return;
    setIsUnbanning(true);

    try {
      const res = await fetch(`/api/mod/bans/${encodeURIComponent(unbanTarget)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Ban kaldırılırken bir hata oluştu.");
      }

      toast.success(`@${unbanTarget} kullanıcısının banı başarıyla kaldırıldı.`);
      setBans((prev) => prev.filter((b) => b.username !== unbanTarget));
      setUnbanTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sunucu hatası";
      toast.error(msg);
    } finally {
      setIsUnbanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Eylem Çubuğu: Başlık ve Ban Ekle Butonu */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h2 className="text-base font-bold text-foreground">Aktif Yasaklamalar (Banlar)</h2>
          <p className="text-xs text-muted-foreground">
            Platform kurallarını ihlal eden hesapların erişim kısıtlamaları.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          data-testid="open-add-ban-dialog-button"
          onClick={() => setBanDialogOpen(true)}
          className="gap-1.5 rounded-xl text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Ban Ekle</span>
        </Button>
      </div>

      {/* Ban Listesi */}
      {bans.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Aktif ban bulunmuyor"
          description="Şu anda sistemde kısıtlanmış veya yasaklanmış kullanıcı hesabı yok."
        />
      ) : (
        <div className="space-y-3" data-testid="bans-list">
          {bans.map((ban) => {
            const isPermanent = !ban.expiresAt;

            return (
              <div
                key={ban.username}
                data-testid={`ban-row-${ban.username}`}
                className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Sol Bilgiler: Kullanıcı, Sebep, Tarihler */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-foreground">
                      @{ban.username}
                    </span>
                    <Badge
                      variant={isPermanent ? "destructive" : "secondary"}
                      size="sm"
                      className="text-[10px] font-mono uppercase"
                    >
                      {isPermanent ? "Kalıcı Ban" : "Süreli Ban"}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Gerekçe: </span>
                    <span>{ban.reason}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Başlangıç: {new Date(ban.bannedAt).toLocaleDateString("tr-TR")}
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Bitiş:{" "}
                      {ban.expiresAt
                        ? new Date(ban.expiresAt).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Süresiz"}
                    </span>
                  </div>
                </div>

                {/* Sağ: Ban Kaldırma Eylemi */}
                <div className="shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={`unban-btn-${ban.username}`}
                    onClick={() => setUnbanTarget(ban.username)}
                    className="gap-1.5 text-xs rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Banı Kaldır</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Yeni Ban Ekle Dialog */}
      <BanDialog
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
        onSuccess={handleBanCreated}
      />

      {/* Ban Kaldırma Onay Dialog */}
      <Dialog
        open={Boolean(unbanTarget)}
        onOpenChange={(open) => {
          if (!open) setUnbanTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span>Banı Kaldır</span>
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono font-bold text-foreground">@{unbanTarget}</span>{" "}
              kullanıcısının hesabındaki ban kısıtlamasını sonlandırmak istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUnbanTarget(null)}
              disabled={isUnbanning}
            >
              İptal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-testid="confirm-unban-button"
              disabled={isUnbanning}
              onClick={handleConfirmUnban}
            >
              {isUnbanning ? "Kaldırılıyor..." : "Banı Kaldır"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
