"use client";

import { AlertCircle, ArrowRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  // Principle 2: Preserve returnUrl & draftKey
  const rawReturnUrl = searchParams.get("returnUrl") || searchParams.get("redirect") || "/";
  // Safe redirect validation (prevent open redirects)
  const returnUrl =
    rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//") ? rawReturnUrl : "/";
  const draftKey = searchParams.get("draftKey");

  const [apiKey, setApiKey] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const login = useSessionStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setErrorMessage(t("auth.login.key_label"));
      return;
    }

    setLoading(true);
    try {
      const result = await login(trimmedKey, rememberMe);
      if (result.ok) {
        // Success: redirect to returnUrl (with draftKey preserved if needed)
        const destination =
          draftKey && !returnUrl.includes("draftKey=")
            ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}draftKey=${encodeURIComponent(draftKey)}`
            : returnUrl;

        router.push(destination);
        router.refresh();
      } else {
        setErrorMessage(result.error || t("errors.INVALID_KEY"));
      }
    } catch {
      setErrorMessage(t("errors.NETWORK_ERROR"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md w-full px-4 py-8 sm:py-12 space-y-6">
      {/* Brand & Manifesto Header */}
      <div className="space-y-3 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
          <KeyRound className="h-6 w-6 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-foreground">
          {t("auth.login.title")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("auth.login.subtitle")}</p>
      </div>

      {/* Info Card: Confident, no password message (Plan §7.1) */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-2/60 border border-border text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Parola yok: </span>
          Actos kriptografik ve anahtar-tabanlı kimlik kullanır. API anahtarınız tek giriş
          belgenizdir.
        </div>
      </div>

      {/* Draft notice banner if user was redirected while typing */}
      {draftKey && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
          <span>
            İçeriğiniz kaydedildi. Giriş yaptıktan sonra kaldığınız yerden devam edeceksiniz.
          </span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="apiKey"
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("auth.login.key_label")}
          </label>
          <div className="relative">
            <Input
              id="apiKey"
              name="apiKey"
              type="text"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t("auth.login.key_placeholder")}
              className="font-mono text-sm pr-10 rounded-xl h-11 bg-surface-2/30"
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
            <span>{t("auth.login.remember_me")}</span>
          </label>
          <span className="text-[11px] text-muted-foreground">1 yıl oturumu korur</span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium animate-in fade-in"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          disabled={loading || !apiKey.trim()}
          className="w-full h-11 rounded-xl text-sm font-semibold shadow-xs cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>{t("auth.login.submitting")}</span>
            </>
          ) : (
            <>
              <span>{t("auth.login.submit")}</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      </form>

      {/* Alternative Navigation Links */}
      <div className="pt-4 border-t border-border/80 space-y-2.5 text-xs text-center text-muted-foreground">
        <div>
          <span>{t("auth.login.no_key")} </span>
          <Link
            href={`/register${rawReturnUrl !== "/" ? `?returnUrl=${encodeURIComponent(rawReturnUrl)}` : ""}`}
            className="font-semibold text-primary hover:underline"
          >
            {t("auth.login.register_link")}
          </Link>
        </div>
        <div>
          <span>{t("auth.login.lost_key")} </span>
          <Link
            href="/recover"
            className="font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            {t("auth.login.recover_link")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
