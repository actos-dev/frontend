"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";

export interface ApplyToJoinFormProps {
  name: string;
}

/**
 * The private-community cover's application form.
 *
 * The pending state is local to this component only. BE-018 means
 * `GET /communities/{name}` carries no `application_status`, so the server
 * cannot render "you already applied" after a reload; that is stated in the
 * UI rather than faked. A 409 from the API (a second pending application) is
 * treated as the same pending state.
 */
export function ApplyToJoinForm({ name }: ApplyToJoinFormProps) {
  const { t } = useTranslation();
  const status = useSessionStore((state) => state.status);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (status === "unauthenticated") {
    return (
      <Button asChild variant="secondary" size="sm">
        <Link href={`/login?returnUrl=${encodeURIComponent(`/c/${name}`)}`}>
          {t("communities.apply.login_required")}
        </Link>
      </Button>
    );
  }

  if (isPending) {
    return (
      <div
        data-testid="apply-pending"
        className="space-y-1 rounded-lg border border-success/30 bg-success/10 p-4 text-left"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("communities.apply.pending_title")}
        </p>
        <p className="text-xs text-fg-muted">{t("communities.apply.pending_description")}</p>
        <p className="text-[11px] text-fg-subtle">{t("communities.apply.pending_reload_note")}</p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    const trimmed = reason.trim();
    if (!trimmed) {
      setErrorMessage(t("communities.apply.reason_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(name)}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed }),
      });

      if (res.status === 409) {
        setIsPending(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 403) {
          setErrorMessage(t("communities.apply.banned"));
        } else {
          setErrorMessage(data?.detail || t("communities.apply.error"));
        }
        return;
      }

      setIsPending(true);
      toast.success(t("communities.apply.success"));
    } catch {
      setErrorMessage(t("communities.apply.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="apply-to-join-form"
      className="w-full space-y-3 text-left"
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-fg">{t("communities.apply.title")}</p>
        <p className="text-xs text-fg-muted">{t("communities.apply.description")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="apply-reason" className="text-xs font-medium">
          {t("communities.apply.reason_label")}
        </Label>
        <Textarea
          id="apply-reason"
          data-testid="apply-reason-input"
          rows={4}
          maxLength={2000}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder={t("communities.apply.reason_placeholder")}
        />
      </div>

      {errorMessage && (
        <p data-testid="apply-error" role="alert" className="text-xs font-medium text-danger">
          {errorMessage}
        </p>
      )}

      <Button type="submit" data-testid="apply-submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{t("communities.apply.submitting")}</span>
          </>
        ) : (
          t("communities.apply.submit")
        )}
      </Button>
    </form>
  );
}
