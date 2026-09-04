"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mapErrorCodeToMessage } from "@/lib/errors";
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
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-3.5 max-w-lg mx-auto w-full",
        className,
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-xs">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-1.5">
        {code && (
          <div>
            <Badge
              variant="outline"
              size="sm"
              className="font-mono text-[10px] tracking-wider border-destructive/40 text-destructive bg-destructive/10 uppercase"
            >
              {code}
            </Badge>
          </div>
        )}

        <h3 className="text-sm sm:text-base font-semibold text-foreground font-serif tracking-tight">
          {title}
        </h3>

        {displayMessage && (
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {displayMessage}
          </p>
        )}

        {requestId && (
          <p className="font-mono text-[11px] text-muted-foreground/80 pt-0.5">
            İstek ID: <span className="text-foreground">{requestId}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="rounded-xl border-border hover:bg-surface-2 gap-1.5 cursor-pointer text-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{retryLabel}</span>
          </Button>
        )}

        {action}
      </div>
    </div>
  );
}
