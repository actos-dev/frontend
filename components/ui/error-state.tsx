"use client";

import { RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mapErrorCodeToMessage } from "@/lib/error-codes";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  code?: string | null;
  locale?: Locale;
  title?: string;
  message?: string;
  requestId?: string | null;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  code = "INTERNAL",
  locale,
  title = "Bir hata oluştu",
  message,
  requestId,
  onRetry,
  retryLabel = "Tekrar dene",
  action,
  className,
}: ErrorStateProps) {
  // If no explicit message provided, derive user-friendly text from error code (Plan §8)
  const displayMessage = message || mapErrorCodeToMessage(code, locale);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 space-y-2 max-w-sm mx-auto w-full",
        className,
      )}
    >
      {code && (
        <Badge
          variant="outline"
          size="sm"
          className="font-mono text-[10px] tracking-wider border-danger/40 text-danger uppercase"
        >
          {code}
        </Badge>
      )}

      <h3 className="text-sm font-semibold text-fg font-serif">{title}</h3>

      {displayMessage && <p className="text-xs text-fg-muted leading-relaxed">{displayMessage}</p>}

      {requestId && (
        <p className="font-mono text-[11px] text-fg-subtle pt-0.5">
          Request ID: <span className="text-fg">{requestId}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {onRetry && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="gap-1.5">
            <RotateCw className="w-3.5 h-3.5" />
            <span>{retryLabel}</span>
          </Button>
        )}

        {action}
      </div>
    </div>
  );
}
