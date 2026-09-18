"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { validateCommunityName } from "@/lib/communities/validation";
import { useTranslation } from "@/lib/i18n";
import { isAuthenticationProblem } from "@/lib/query/http";
import { cn } from "@/lib/utils";

/**
 * `/c/new`. The name is validated optimistically with the same rules the API
 * enforces (the username format plus the reserved list). The visibility choice
 * is a one-way door, so the warning is attached to the option itself, not
 * buried in a tooltip.
 *
 * The API owns the three-owned-communities limit and community-name
 * uniqueness; there is no endpoint that reports either, so the form does not
 * pre-empt them and surfaces the server's 400/409 honestly.
 */
export function CommunityCreateForm() {
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validation = useMemo(() => validateCommunityName(name), [name]);
  const showNameStatus = name.trim().length > 0;

  const nameStatusText = (() => {
    if (!showNameStatus) return t("communities.create_form.name_hint");
    if (!validation.ok) {
      return validation.error === "reserved"
        ? t("communities.create_form.name_error_reserved")
        : t("communities.create_form.name_error_invalid");
    }
    return t("communities.create_form.name_hint");
  })();

  const canSubmit =
    validation.ok &&
    description.trim().length > 0 &&
    description.trim().length <= 10000 &&
    !isSubmitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!validation.ok) {
      setErrorMessage(
        validation.error === "reserved"
          ? t("communities.create_form.name_error_reserved")
          : t("communities.create_form.name_error_invalid"),
      );
      return;
    }
    if (!description.trim()) {
      setErrorMessage(t("communities.create_form.description_hint"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: validation.normalized,
          description: description.trim(),
          visibility,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (isAuthenticationProblem({ status: res.status, code: data?.code })) {
          router.push("/login?returnUrl=/c/new");
          return;
        }
        if (res.status === 400 && /3 communities|at most 3|limit/i.test(data?.detail || "")) {
          setErrorMessage(t("communities.create_form.error_limit"));
        } else if (res.status === 409) {
          setErrorMessage(t("communities.create_form.name_taken"));
        } else {
          setErrorMessage(data?.detail || t("communities.create_form.error_generic"));
        }
        return;
      }

      const createdName = data.community?.name || validation.normalized;
      toast.success(t("communities.create_form.success", { name: createdName }));
      router.push(`/c/${encodeURIComponent(createdName)}`);
      router.refresh();
    } catch {
      setErrorMessage(t("communities.create_form.error_generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="community-create-form"
      className="mx-auto max-w-2xl space-y-7"
    >
      <div className="space-y-1.5">
        <Label htmlFor="community-name" className="text-xs font-semibold">
          {t("communities.create_form.name_label")}
        </Label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-fg-muted">c/</span>
          <Input
            id="community-name"
            data-testid="community-name-input"
            value={name}
            onChange={(event) => {
              setName(event.target.value.toLowerCase());
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={t("communities.create_form.name_placeholder")}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        </div>
        <p
          data-testid="community-name-status"
          aria-live="polite"
          className={cn("text-xs", !validation.ok ? "text-danger" : "text-fg-muted")}
        >
          {nameStatusText}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">
          {t("communities.create_form.description_label")}
        </Label>
        <MarkdownEditor
          value={description}
          onChange={setDescription}
          placeholder={t("communities.create_form.description_placeholder")}
          compact
          minRows={6}
        />
        <p className="text-xs text-fg-muted">{t("communities.create_form.description_hint")}</p>
      </div>

      <fieldset className="space-y-2.5 border-0 p-0 m-0">
        <legend className="text-xs font-semibold">
          {t("communities.create_form.visibility_label")}
        </legend>
        <div className="space-y-2">
          {[
            {
              value: "public" as const,
              titleKey: "communities.create_form.visibility_public_title",
              bodyKey: "communities.create_form.visibility_public_description",
            },
            {
              value: "private" as const,
              titleKey: "communities.create_form.visibility_private_title",
              bodyKey: "communities.create_form.visibility_private_description",
            },
          ].map((option) => {
            const selected = visibility === option.value;
            return (
              <label
                key={option.value}
                data-testid={`visibility-option-${option.value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                  selected ? "border-primary bg-primary/5" : "border-border hover:bg-surface-2/60",
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={selected}
                  onChange={() => setVisibility(option.value)}
                  className="mt-0.5 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{t(option.titleKey)}</span>
                  <span className="mt-0.5 block text-xs text-fg-muted">{t(option.bodyKey)}</span>
                  {option.value === "private" && (
                    <span
                      data-testid="private-visibility-warning"
                      className="mt-1 block text-xs font-medium text-danger"
                    >
                      {t("communities.create_form.private_warning")}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-fg-subtle">{t("communities.create_form.owned_limit_note")}</p>
      </fieldset>

      {errorMessage && (
        <div
          data-testid="community-create-error"
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 p-3 text-xs font-medium text-danger"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
        <Button type="submit" data-testid="community-create-submit" disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{t("communities.create_form.submitting")}</span>
            </>
          ) : (
            <span>{t("communities.create_form.submit")}</span>
          )}
        </Button>
      </div>
    </form>
  );
}
