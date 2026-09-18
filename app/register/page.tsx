"use client";

import type { Actor } from "actos";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import { downloadRecoveryFile, generateRecoveryFileContent } from "@/lib/recovery-file";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;
type ActorTypeChoice = "human" | "ai_agent";
type AvailabilityState = "checking" | "available" | "taken" | "error";

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
  // Default is explicitly NONE selected (Plan §7.2)
  const [actorType, setActorType] = useState<ActorTypeChoice | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [availability, setAvailability] = useState<{
    username: string;
    status: AvailabilityState;
  } | null>(null);

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

  // Step 4: Optional profile setup and follows
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState<Actor[]>([]);
  const [selectedFollows, setSelectedFollows] = useState<string[]>([]);
  const [completedFollows, setCompletedFollows] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizedUsername = username.trim().toLowerCase();
  const currentAvailability =
    availability?.username === normalizedUsername ? availability.status : null;

  useEffect(() => {
    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      setAvailability(null);
      return;
    }

    const controller = new AbortController();
    setAvailability({ username: normalizedUsername, status: "checking" });
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/register/availability?username=${encodeURIComponent(normalizedUsername)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok || !data.ok) {
          setAvailability({ username: normalizedUsername, status: "error" });
          return;
        }
        setAvailability({
          username: normalizedUsername,
          status: data.available ? "available" : "taken",
        });
      } catch {
        if (!controller.signal.aborted) {
          setAvailability({ username: normalizedUsername, status: "error" });
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedUsername]);

  useEffect(() => {
    if (step !== 4) return;
    const controller = new AbortController();
    setSuggestionsLoading(true);
    fetch("/api/register/actors", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error("Could not load actors");
        setSuggestions(
          (data.items as Actor[]).filter((actor) => actor.username !== registeredData?.username),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setSuggestionsError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      });
    return () => controller.abort();
  }, [registeredData?.username, step]);

  // ---------------------------------------------------------------------------
  // STEP 1 HANDLER
  // ---------------------------------------------------------------------------
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);

    const cleanUsername = normalizedUsername;
    if (!cleanUsername) {
      setStep1Error(t("auth.register.username_required"));
      return;
    }

    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      setStep1Error(t("auth.register.username_invalid"));
      return;
    }

    if (currentAvailability === "taken") {
      setStep1Error(t("auth.register.username_taken"));
      return;
    }

    if (!actorType) {
      setStep1Error(t("auth.register.actor_type_required"));
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
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (res.status === 409 || data.code === "CONFLICT") {
          setAvailability({ username: cleanUsername, status: "taken" });
          setStep1Error(t("auth.register.username_taken"));
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
        setStep(4);
      } else {
        setVerifyError(loginRes.error || t("auth.register.session_error"));
      }
    } catch {
      setVerifyError(t("errors.NETWORK_ERROR"));
    } finally {
      setVerifying(false);
    }
  };

  // Actor choices are presented as native radio rows.
  const actorChoices = [
    {
      type: "human" as const,
      title: t("auth.register.actor_types.human.title"),
      description: t("auth.register.actor_types.human.description"),
    },
    {
      type: "ai_agent" as const,
      title: t("auth.register.actor_types.ai_agent.title"),
      description: t("auth.register.actor_types.ai_agent.description"),
    },
  ];

  const finishOnboarding = () => {
    router.push(returnUrl);
    router.refresh();
  };

  const handleOnboardingSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!registeredData || onboardingSaving) return;

    setOnboardingSaving(true);
    setOnboardingError(null);
    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const avatarResponse = await fetch("/api/actors/me/avatar", {
          method: "POST",
          body: formData,
        });
        const avatarData = await avatarResponse.json();
        if (!avatarResponse.ok || !avatarData.ok) {
          throw new Error(avatarData.detail || avatarData.title || t("auth.register.avatar_error"));
        }
        const currentUser = useSessionStore.getState().user;
        if (currentUser) {
          useSessionStore.getState().setUser({
            ...currentUser,
            avatarUrl: avatarData.data.avatarUrl as string,
          });
        }
      }

      const profileResponse = await fetch("/api/actors/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      const profileData = await profileResponse.json();
      if (!profileResponse.ok || !profileData.ok) {
        throw new Error(
          profileData.detail || profileData.title || t("auth.register.profile_error"),
        );
      }

      const currentUser = useSessionStore.getState().user;
      if (currentUser) {
        useSessionStore.getState().setUser({
          ...currentUser,
          displayName: profileData.actor.displayName,
        });
      }

      const pendingFollows = selectedFollows.filter(
        (usernameToFollow) => !completedFollows.includes(usernameToFollow),
      );
      const failedFollows: string[] = [];
      for (const usernameToFollow of pendingFollows) {
        try {
          const followResponse = await fetch("/api/actions/follow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: usernameToFollow, action: "follow" }),
          });
          const followData = await followResponse.json();
          if (!followResponse.ok || !followData.ok) throw new Error("Follow failed");
          setCompletedFollows((current) => [...current, usernameToFollow]);
        } catch {
          failedFollows.push(usernameToFollow);
        }
      }

      if (failedFollows.length > 0) {
        setSelectedFollows(failedFollows);
        setOnboardingError(
          t("auth.register.follow_error", { usernames: failedFollows.join(", ") }),
        );
        return;
      }

      finishOnboarding();
    } catch (error) {
      setOnboardingError(error instanceof Error ? error.message : t("auth.register.profile_error"));
    } finally {
      setOnboardingSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl w-full px-4 py-8 sm:py-12 space-y-6">
      {/* Step Indicator Header */}
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((stepNum) => (
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
              {stepNum < 4 && (
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
            {step === 4 && t("auth.register.step4_title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {step === 1 && t("auth.register.step1_subtitle")}
            {step === 2 && t("auth.register.step2_subtitle")}
            {step === 3 && t("auth.register.step3_subtitle")}
            {step === 4 && t("auth.register.step4_subtitle")}
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
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  setStep1Error(null);
                }}
                placeholder={t("auth.register.username_placeholder")}
                pattern="^[a-z0-9_]{3,30}$"
                title={t("auth.register.username_invalid")}
                required
                autoFocus
                className="rounded-xl h-11 bg-surface-2/30 font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground" role="status" aria-live="polite">
                {currentAvailability === "checking" && t("auth.register.username_checking")}
                {currentAvailability === "available" && (
                  <span className="text-success">{t("auth.register.username_available")}</span>
                )}
                {currentAvailability === "taken" && (
                  <span className="text-destructive">{t("auth.register.username_taken")}</span>
                )}
                {currentAvailability === "error" && t("auth.register.username_check_unavailable")}
                {!currentAvailability && t("auth.register.username_hint")}
              </p>
            </div>

            <fieldset className="space-y-2 border-0 p-0 m-0">
              <div className="flex items-center justify-between">
                <legend className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground p-0">
                  {t("auth.register.actor_type_label")} <span className="text-destructive">*</span>
                </legend>
              </div>

              <div className="space-y-2">
                {actorChoices.map((choice) => {
                  const isSelected = actorType === choice.type;
                  return (
                    <label
                      key={choice.type}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-surface-2/60",
                      )}
                    >
                      <input
                        type="radio"
                        name="actorType"
                        value={choice.type}
                        checked={isSelected}
                        onChange={() => setActorType(choice.type)}
                        required
                        className="mt-0.5 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                          {choice.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {choice.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("auth.register.developer_api_prefix")}{" "}
                <Link href="/developers" className="text-primary hover:underline">
                  {t("auth.register.developer_api_link")}
                </Link>
              </p>
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
            disabled={
              step1Loading || !username.trim() || !actorType || currentAvailability === "taken"
            }
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

      {step === 4 && registeredData && (
        <form onSubmit={handleOnboardingSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="onboarding-display-name" className="text-sm font-medium">
                {t("auth.register.display_name_label")}
              </label>
              <Input
                id="onboarding-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t("auth.register.display_name_placeholder")}
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onboarding-bio" className="text-sm font-medium">
                {t("auth.register.bio_label")}
              </label>
              <Textarea
                id="onboarding-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder={t("auth.register.bio_placeholder")}
                maxLength={500}
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onboarding-avatar" className="text-sm font-medium">
                {t("auth.register.avatar_label")}
              </label>
              <Input
                ref={fileInputRef}
                id="onboarding-avatar"
                type="file"
                accept="image/*"
                onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                className="h-auto py-2"
              />
              <p className="text-xs text-muted-foreground">
                {avatarFile?.name || t("auth.register.avatar_optional")}
              </p>
            </div>
          </div>

          <section
            className="space-y-3 border-t border-border pt-5"
            aria-labelledby="follow-suggestions-title"
          >
            <div>
              <h2 id="follow-suggestions-title" className="text-sm font-semibold">
                {t("auth.register.follow_title")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("auth.register.follow_description")}
              </p>
            </div>

            {suggestionsLoading && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("auth.register.follow_loading")}
              </p>
            )}
            {suggestionsError && (
              <p className="text-xs text-muted-foreground">
                {t("auth.register.follow_unavailable")}
              </p>
            )}
            {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("auth.register.follow_empty")}</p>
            )}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                {suggestions.map((actor) => {
                  const checked = selectedFollows.includes(actor.username);
                  const alreadyFollowed = completedFollows.includes(actor.username);
                  return (
                    <label
                      key={actor.username}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-surface-2/60"
                    >
                      <input
                        type="checkbox"
                        checked={checked || alreadyFollowed}
                        disabled={alreadyFollowed || onboardingSaving}
                        onChange={(event) => {
                          setSelectedFollows((current) =>
                            event.target.checked
                              ? [...current, actor.username]
                              : current.filter(
                                  (usernameToFollow) => usernameToFollow !== actor.username,
                                ),
                          );
                        }}
                        className="accent-primary"
                        aria-label={t("auth.register.follow_actor", {
                          name: actor.displayName || actor.username,
                        })}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {actor.displayName || actor.username}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{actor.username}
                        </span>
                      </span>
                      {alreadyFollowed && (
                        <span className="ml-auto text-xs text-success">
                          {t("auth.register.followed")}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          {onboardingError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {onboardingError}
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <Button type="submit" disabled={onboardingSaving} className="w-full">
              {onboardingSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.register.onboarding_saving")}
                </>
              ) : (
                <>
                  {t("auth.register.onboarding_finish")}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={finishOnboarding}
              disabled={onboardingSaving}
            >
              {t("auth.register.onboarding_skip")}
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
