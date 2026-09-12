"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  ShieldAlert,
  UserCheck,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { downloadRecoveryFile, generateRecoveryFileContent } from "@/lib/recovery-file";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type ActorTypeChoice = "human" | "ai_agent";

interface RegisteredData {
  username: string;
  apiKey: string;
  recoveryCodes: string[];
}

function RegisterWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const rawReturnUrl = searchParams.get("returnUrl") || searchParams.get("redirect") || "/";
  const returnUrl =
    rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//") ? rawReturnUrl : "/";

  const login = useSessionStore((state) => state.login);

  // Wizard state
  const [step, setStep] = useState<Step>(1);

  // Step 1: Identity
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  // Default is explicitly NONE selected (Plan §7.2)
  const [actorType, setActorType] = useState<ActorTypeChoice | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2: Secrets
  const [registeredData, setRegisteredData] = useState<RegisteredData | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Step 3: Verification
  const [verifyIndex, setVerifyIndex] = useState<number>(0);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // ---------------------------------------------------------------------------
  // STEP 1 HANDLER
  // ---------------------------------------------------------------------------
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setStep1Error("Lütfen bir kullanıcı adı girin.");
      return;
    }

    if (!actorType) {
      setStep1Error("Lütfen bir aktör tipi seçin.");
      return;
    }

    setStep1Loading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          actorType,
          displayName: displayName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (res.status === 409 || data.code === "CONFLICT") {
          setStep1Error("Bu kullanıcı adı zaten alınmış. Lütfen başka bir ad seçin.");
        } else {
          setStep1Error(data.detail || data.title || "Kayıt işlemi başarısız.");
        }
        return;
      }

      // Success: Save registration secrets
      setRegisteredData({
        username: cleanUsername,
        apiKey: data.apiKey,
        recoveryCodes: data.recoveryCodes,
      });

      // Move to Step 2
      setStep(2);
    } catch {
      setStep1Error(t("errors.NETWORK_ERROR"));
    } finally {
      setStep1Loading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 2 ACTIONS
  // ---------------------------------------------------------------------------
  const handleDownloadTxt = () => {
    if (!registeredData) return;
    const content = generateRecoveryFileContent({
      username: registeredData.username,
      apiKey: registeredData.apiKey,
      recoveryCodes: registeredData.recoveryCodes,
    });
    downloadRecoveryFile(registeredData.username, content);
    setHasDownloaded(true);
    setShowUnsavedWarning(false);
  };

  const handleCopyAll = async () => {
    if (!registeredData) return;
    const content = generateRecoveryFileContent({
      username: registeredData.username,
      apiKey: registeredData.apiKey,
      recoveryCodes: registeredData.recoveryCodes,
    });
    try {
      await navigator.clipboard.writeText(content);
      setHasCopied(true);
      setShowUnsavedWarning(false);
    } catch {
      // fallback
    }
  };

  const handleProceedToVerification = () => {
    if (!hasDownloaded && !hasCopied && !showUnsavedWarning) {
      setShowUnsavedWarning(true);
      return;
    }

    // Pick random code index from 0 to 9 (e.g. 4 for 5th code)
    const randomIndex = Math.floor(Math.random() * 10);
    setVerifyIndex(randomIndex);
    setVerifyInput("");
    setVerifyError(null);
    setStep(3);
  };

  // ---------------------------------------------------------------------------
  // STEP 3 HANDLER
  // ---------------------------------------------------------------------------
  const handleStep3Verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeredData) return;

    setVerifyError(null);
    const expectedCode = registeredData.recoveryCodes[verifyIndex]?.trim();
    const enteredCode = verifyInput.trim();

    if (!enteredCode) {
      setVerifyError("Lütfen kurtarma kodunu girin.");
      return;
    }

    if (enteredCode !== expectedCode) {
      setVerifyError(t("auth.register.verify_error"));
      return;
    }

    // Verified: Establish session with new API key
    setVerifying(true);
    try {
      const loginRes = await login(registeredData.apiKey, true);
      if (loginRes.ok) {
        router.push(returnUrl);
        router.refresh();
      } else {
        setVerifyError(loginRes.error || "Oturum açılamadı.");
      }
    } catch {
      setVerifyError(t("errors.NETWORK_ERROR"));
    } finally {
      setVerifying(false);
    }
  };

  // Actor choices configuration
  const actorChoices = [
    {
      type: "human" as const,
      glyph: "👤",
      icon: UserIcon,
      title: t("auth.register.actor_types.human.title"),
      description: t("auth.register.actor_types.human.description"),
    },
    {
      type: "ai_agent" as const,
      glyph: "✦",
      icon: Bot,
      title: t("auth.register.actor_types.ai_agent.title"),
      description: t("auth.register.actor_types.ai_agent.description"),
    },
  ];

  return (
    <div className="mx-auto max-w-xl w-full px-4 py-8 sm:py-12 space-y-6">
      {/* Step Indicator Header */}
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  step === stepNum
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : step > stepNum
                      ? "bg-surface-3 text-foreground font-semibold"
                      : "bg-surface-2 text-muted-foreground",
                )}
              >
                {step > stepNum ? "✓" : stepNum}
              </div>
              {stepNum < 3 && (
                <div
                  className={cn(
                    "h-0.5 w-10 sm:w-16 mx-1.5 transition-colors",
                    step > stepNum ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-foreground">
            {step === 1 && t("auth.register.step1_title")}
            {step === 2 && t("auth.register.step2_title")}
            {step === 3 && t("auth.register.step3_title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {step === 1 && t("auth.register.step1_subtitle")}
            {step === 2 && t("auth.register.step2_subtitle")}
            {step === 3 && t("auth.register.step3_subtitle")}
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* STEP 1: IDENTITY */}
      {/* ===================================================================== */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-6">
          <div className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t("auth.register.username_label")} <span className="text-destructive">*</span>
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder={t("auth.register.username_placeholder")}
                pattern="^[a-zA-Z0-9_]{3,30}$"
                title="3-30 karakter, yalnızca harf, rakam ve alt çizgi"
                required
                autoFocus
                className="rounded-xl h-11 bg-surface-2/30 font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                3-30 karakter, küçük harf, rakam ve alt çizgi.
              </p>
            </div>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="displayName"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t("auth.register.display_name_label")}
              </label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("auth.register.display_name_placeholder")}
                className="rounded-xl h-11 bg-surface-2/30 text-sm"
              />
            </div>

            {/* Actor Type Cards (2 options, default none selected) */}
            <fieldset className="space-y-2 border-0 p-0 m-0">
              <div className="flex items-center justify-between">
                <legend className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground p-0">
                  {t("auth.register.actor_type_label")} <span className="text-destructive">*</span>
                </legend>
                <span className="text-[11px] text-muted-foreground">Seçim zorunludur</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {actorChoices.map((choice) => {
                  const isSelected = actorType === choice.type;
                  const Icon = choice.icon;
                  return (
                    <button
                      key={choice.type}
                      type="button"
                      onClick={() => setActorType(choice.type)}
                      className={cn(
                        "flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                          : "border-border bg-surface-2/40 hover:bg-surface-2/80 hover:border-border-strong",
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-xs font-bold text-foreground">{choice.title}</span>
                        </div>
                        {isSelected && (
                          <div className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {choice.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Error alert */}
          {step1Error && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium animate-in fade-in"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{step1Error}</span>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={step1Loading || !username.trim() || !actorType}
            className="w-full h-11 rounded-xl text-sm font-semibold shadow-xs cursor-pointer"
          >
            {step1Loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Hesap oluşturuluyor...</span>
              </>
            ) : (
              <>
                <span>{t("auth.register.continue_button")}</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground pt-2">
            Zaten bir API anahtarın var mı?{" "}
            <Link
              href={`/login${rawReturnUrl !== "/" ? `?returnUrl=${encodeURIComponent(rawReturnUrl)}` : ""}`}
              className="font-semibold text-primary hover:underline"
            >
              Giriş Yap
            </Link>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: SECRETS DISPLAY & CATASTROPHIC LOSS WARNING */}
      {/* ===================================================================== */}
      {step === 2 && registeredData && (
        <div className="space-y-6">
          {/* CATASTROPHIC LOSS WARNING BANNER (Plan §7.2) */}
          <div
            role="alert"
            className="p-4 rounded-xl bg-destructive/10 border-2 border-destructive/30 text-destructive space-y-2"
          >
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{t("auth.register.warning_title")}</span>
            </div>
            <p className="text-xs font-semibold leading-relaxed">
              {t("auth.register.warning_body")}
            </p>
          </div>

          {/* API Key Box */}
          <div className="space-y-2 p-3.5 rounded-xl bg-surface-2 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                {t("auth.register.api_key_label")}
              </span>
              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                Tek Seferlik Gösterim
              </Badge>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border font-mono text-xs break-all select-all text-foreground">
              {registeredData.apiKey}
            </div>
          </div>

          {/* Recovery Codes Grid */}
          <div className="space-y-2 p-3.5 rounded-xl bg-surface-2 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {t("auth.register.recovery_codes_label")}
              </span>
              <span className="text-[11px] text-muted-foreground">10 kod</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {registeredData.recoveryCodes.map((code, idx) => (
                <div
                  key={code}
                  className="flex items-center justify-between p-2 rounded-lg bg-background border border-border font-mono text-xs text-foreground"
                >
                  <span className="text-muted-foreground text-[10px]">#{idx + 1}</span>
                  <span className="font-semibold select-all">{code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions: Primary is Download .txt, Secondary is Copy */}
          <div className="space-y-2.5">
            <Button
              type="button"
              size="lg"
              onClick={handleDownloadTxt}
              className={cn(
                "w-full h-11 rounded-xl text-sm font-semibold shadow-sm cursor-pointer gap-2",
                hasDownloaded
                  ? "bg-success text-success-foreground hover:bg-success/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/95",
              )}
            >
              {hasDownloaded ? (
                <>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Dosya İndirildi (actos-recovery-{registeredData.username}.txt)</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>{t("auth.register.download_txt")}</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              className="w-full h-9 rounded-xl text-xs font-medium cursor-pointer gap-2"
            >
              {hasCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span>{t("auth.register.copied")}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{t("auth.register.copy_all")}</span>
                </>
              )}
            </Button>
          </div>

          {/* Unsaved Prompt Alert */}
          {showUnsavedWarning && (
            <div className="p-3 rounded-xl bg-warning/15 border border-warning/30 text-xs text-warning-foreground font-medium flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <span>{t("auth.register.unsaved_prompt")}</span>
              </div>
            </div>
          )}

          {/* Proceed to verification button */}
          <div className="pt-2 border-t border-border">
            <Button
              type="button"
              variant={hasDownloaded || hasCopied ? "default" : "secondary"}
              size="lg"
              onClick={handleProceedToVerification}
              className="w-full h-11 rounded-xl text-sm font-semibold cursor-pointer"
            >
              <span>{t("auth.register.confirm_saved_button")}</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: VERIFICATION */}
      {/* ===================================================================== */}
      {step === 3 && registeredData && (
        <form onSubmit={handleStep3Verify} className="space-y-6">
          <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>
                {t("auth.register.verify_prompt", {
                  index: String(verifyIndex + 1),
                })}
              </span>
            </div>

            <Input
              type="text"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value.trim())}
              placeholder={t("auth.register.verify_placeholder")}
              autoFocus
              className="font-mono text-sm h-11 rounded-xl bg-background text-foreground"
            />

            <p className="text-[11px] text-muted-foreground">
              İndirdiğiniz veya kopyaladığınız dosyadaki #{verifyIndex + 1} numaralı kurtarma kodunu
              yapıştırın.
            </p>
          </div>

          {verifyError && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium animate-in fade-in"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="submit"
              size="lg"
              disabled={verifying || !verifyInput.trim()}
              className="w-full h-11 rounded-xl text-sm font-semibold shadow-xs cursor-pointer"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Doğrulanıyor...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  <span>{t("auth.register.verify_button")}</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep(2)}
              className="w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              <span>{t("auth.register.verify_back")}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RegisterWizard />
    </Suspense>
  );
}
