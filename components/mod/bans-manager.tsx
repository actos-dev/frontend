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

export function BansManager() {
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [unbanTarget, setUnbanTarget] = useState<string | null>(null);
  const [isUnbanning, setIsUnbanning] = useState(false);

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

      toast.success(`@${unbanTarget} kullanıcısının banı kaldırıldı.`);
      setUsername("");
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Ban işlemleri</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Hesapları süreli veya kalıcı olarak kısıtlayın.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          data-testid="open-add-ban-dialog-button"
          onClick={() => setBanDialogOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Ban ekle</span>
        </Button>
      </div>

      <div
        role="status"
        data-testid="ban-list-unsupported"
        className="flex gap-3 border border-border bg-surface-2/50 p-4"
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Aktif ban listesi kullanılamıyor</p>
          <p className="text-sm text-muted-foreground">
            Actos API etkin banları listeleme ucu sunmuyor. Ban ekleyebilir veya kullanıcı adını
            yazarak bir banı kaldırabilirsiniz.
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
          <Label htmlFor="ban-remove-username">Banı kullanıcı adına göre kaldır</Label>
          <Input
            id="ban-remove-username"
            data-testid="ban-remove-username-input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
            placeholder="kullanıcı adı"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={!username.trim()}>
          <UserX className="mr-1.5 h-4 w-4" />
          Banı kaldır
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
              <span>Banı kaldır</span>
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold text-foreground">@{unbanTarget}</span> için
              ban kaldırma isteği gönderilsin mi? Kullanıcı şu anda banlı değilse API işlemi
              değişiklik yapmadan tamamlar.
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
              {isUnbanning ? "Kaldırılıyor..." : "Banı kaldır"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
