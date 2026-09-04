"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  Download,
  KeyRound,
  LifeBuoy,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";

export default function RecoverPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const setUser = useSessionStore((state) => state.setUser);

  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success state
  const [newKey, setNewKey] = useState<string | null>(null);
  const [remainingCodes, setRemainingCodes] = useState<number | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanCode = recoveryCode.trim();

    if (!cleanUsername || !cleanCode) {
      setErrorMessage(
        `${t("auth.recover.username_label")} ve ${t("auth.recover.code_label")} gereklidir.`,
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          recoveryCode: cleanCode,
          rememberMe: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.detail || data.title || "Kurtarma kodu geçersiz veya kullanılmış.");
        return;
      }

      // Success
      setNewKey(data.apiKey);
      setRemainingCodes(data.remainingRecoveryCodes);
      if (data.user) {
        setUser(data.user);
      }
    } catch {
      setErrorMessage(t("errors.NETWORK_ERROR"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNewKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setHasCopied(true);
    } catch {
      // fallback
    }
  };

  const handleDownloadNewKey = () => {
    if (!newKey) return;
    const content = `ACTOS YENİ API ANAHTARI
Kullanıcı Adı: ${username}
Tarih: ${new Date().toISOString()}
Yeni API Anahtarı: ${newKey}
Kalan Kurtarma Kodu Sayısı: ${remainingCodes ?? "Bilinmiyor"}
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `actos-new-key-${username}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="space-y-3 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
          <LifeBuoy className="h-6 w-6 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-foreground">
          {t("auth.recover.title")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("auth.recover.subtitle")}
        </p>
      </div>

      {!newKey ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-2">
            <label
              htmlFor="recover-username"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("auth.recover.username_label")}
            </label>
            <Input
              id="recover-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="kullanici_adiniz"
              required
              autoFocus
              className="font-mono text-sm h-11 rounded-xl bg-surface-2/30"
            />
          </div>

          {/* Recovery Code */}
          <div className="space-y-2">
            <label
              htmlFor="recover-code"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("auth.recover.code_label")}
            </label>
            <Input
              id="recover-code"
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.trim())}
              placeholder={t("auth.recover.code_placeholder")}
              required
              className="font-mono text-sm h-11 rounded-xl bg-surface-2/30"
            />
            <p className="text-[11px] text-muted-foreground">
              Kaydettiğiniz 10 kurtarma kodundan henüz kullanmadığınız herhangi birini girin.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={loading || !username.trim() || !recoveryCode.trim()}
            className="w-full h-11 rounded-xl text-sm font-semibold shadow-xs cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>{t("auth.recover.submitting")}</span>
              </>
            ) : (
              <>
                <span>{t("auth.recover.submit")}</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground pt-2">
            <Link href="/login" className="hover:underline">
              ← {t("auth.recover.back_to_login")}
            </Link>
          </div>
        </form>
      ) : (
        /* Recovered Success View */
        <div className="space-y-6 animate-in fade-in">
          <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success space-y-1 text-center">
            <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
              <ShieldCheck className="h-5 w-5" />
              <span>{t("auth.recover.success_title")}</span>
            </div>
            <p className="text-xs text-foreground/80">
              {t("auth.recover.success_desc", {
                remaining: String(remainingCodes ?? 0),
              })}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                {t("auth.recover.new_key_label")}
              </span>
              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                Yeni Anahtar
              </Badge>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border font-mono text-xs break-all select-all text-foreground">
              {newKey}
            </div>
          </div>

          <div className="space-y-2.5">
            <Button
              type="button"
              size="lg"
              onClick={handleDownloadNewKey}
              className="w-full h-11 rounded-xl text-sm font-semibold shadow-xs cursor-pointer gap-2"
            >
              <Download className="h-4 w-4" />
              <span>{t("auth.recover.download_new_key")}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyNewKey}
              className="w-full h-9 rounded-xl text-xs font-medium cursor-pointer gap-2"
            >
              {hasCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span>Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Anahtarı Kopyala</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
              className="w-full h-11 rounded-xl text-sm font-semibold cursor-pointer"
            >
              <span>{t("auth.recover.go_feed")}</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
