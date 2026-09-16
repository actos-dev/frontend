"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

/**
 * Route-segment error boundary (ROADMAP.md S-06): text-first, no icon
 * circle, one action ("Try again"), fully localized. `error.tsx` must be a
 * Client Component in Next.js, but it still renders inside the root
 * layout's providers, so `useTranslation()` works here.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error("Actos application error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      aria-labelledby="error-heading"
      className="flex flex-col items-center justify-center text-center px-6 py-20 sm:py-28 max-w-md mx-auto min-h-[50vh]"
    >
      <p className="font-mono text-xs uppercase tracking-wider text-danger mb-3">
        {t("errorPages.errorBadge")}
      </p>
      <h1
        id="error-heading"
        className="text-2xl sm:text-3xl font-semibold font-serif text-fg tracking-tight mb-3"
      >
        {t("errorPages.errorTitle")}
      </h1>
      <p className="text-sm text-fg-muted leading-relaxed mb-6">
        {t("errorPages.errorDescription")}
      </p>

      {error.digest && (
        <p className="font-mono text-xs text-fg-subtle mb-8 select-all">{error.digest}</p>
      )}

      <Button type="button" onClick={() => reset()} size="md">
        {t("errorPages.retry")}
      </Button>
    </div>
  );
}
