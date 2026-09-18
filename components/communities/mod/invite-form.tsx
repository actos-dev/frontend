"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";

export interface InviteFormProps {
  communityName: string;
  isPrivate: boolean;
}

/**
 * Invite-by-username for a private community. A public community answers 400
 * (join is instant), so the form explains that instead of offering a control
 * that cannot work.
 */
export function InviteForm({ communityName, isPrivate }: InviteFormProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isPrivate) {
    return (
      <div data-testid="invite-form-public" className="space-y-1">
        <h2 className="text-sm font-semibold text-fg">{t("communities.mod.invitations.title")}</h2>
        <p className="text-xs text-fg-muted">{t("communities.mod.invitations.public_note")}</p>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    const target = username.trim().replace(/^@/, "");
    if (!target) {
      setErrorMessage(t("moderation.roles.username_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(communityName)}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.detail || t("communities.mod.invitations.error"));
        return;
      }
      toast.success(t("communities.mod.invitations.success", { username: target }));
      setUsername("");
    } catch {
      setErrorMessage(t("communities.mod.invitations.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="invite-form" className="max-w-md space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-fg">{t("communities.mod.invitations.title")}</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          {t("communities.mod.invitations.description")}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-username" className="text-xs font-medium">
          {t("communities.mod.invitations.username_label")}
        </Label>
        <Input
          id="invite-username"
          data-testid="invite-username-input"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value.toLowerCase());
            if (errorMessage) setErrorMessage(null);
          }}
          autoComplete="off"
          placeholder={t("communities.mod.invitations.username_placeholder")}
          className="font-mono"
        />
      </div>

      {errorMessage ? (
        <p data-testid="invite-error" role="alert" className="text-xs font-medium text-danger">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="sm" data-testid="invite-submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>{t("communities.mod.invitations.send")}</span>
      </Button>
    </form>
  );
}
