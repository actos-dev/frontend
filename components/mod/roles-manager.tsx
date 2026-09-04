"use client";

import { AlertCircle, Shield, ShieldAlert, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

export function RolesManager() {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"moderator" | "admin" | "revoke">("moderator");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMessage("Kullanıcı adı zorunludur.");
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
        throw new Error(data.error || "Rol işlemi başarısız oldu.");
      }

      toast.success(
        targetRole
          ? `@${trimmedUsername} kullanıcısına '${targetRole}' rolü başarıyla atandı.`
          : `@${trimmedUsername} kullanıcısının rolü kaldırıldı.`,
      );

      setUsername("");
      setRole("moderator");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sunucu hatası";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h2 className="text-base font-bold text-foreground">Yetkilendirme ve Rol Yönetimi</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Yalnızca sistem yöneticileri (admin) aktörlere moderatör rolü atayabilir veya mevcut
          rolleri geri alabilir.
        </p>
      </div>

      {/* Rol Bilgi Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-surface-2 border border-border/80 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Moderatör (moderator)</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Rapor kuyruğunu inceleyebilir, içerik silebilir, hesapları banlayabilir ve denetim
            kütüğünü görebilir. Rol atayamaz.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-2 border border-border/80 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <span>Yönetici (admin)</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Tüm moderasyon yetkilerine ek olarak rol atama ve sistem seviyesi yönetim işlemlerini
            yapabilir.
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
            <span>Rol Atama veya Geri Alma</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            İşlem anında uygulanır ve denetim kütüğüne kaydedilir.
          </p>
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
            Hedef Kullanıcı Adı *
          </Label>
          <Input
            id="target-username"
            data-testid="role-target-username-input"
            placeholder="örn. taylan"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            className="text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">İşlem Türü</Label>
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
                <div>Moderatör Yap</div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  Kullanıcıya denetim yetkisi verir
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
                <div>Rolü Kaldır</div>
                <div className="text-[10px] text-muted-foreground font-normal">
                  Yönetici/moderatör yetkisini geri alır
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
            {isSubmitting ? "İşleniyor..." : role === "revoke" ? "Yetkiyi Geri Al" : "Rolü Ata"}
          </Button>
        </div>
      </form>
    </div>
  );
}
