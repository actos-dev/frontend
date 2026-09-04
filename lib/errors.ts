import { ActosAPIError, ActosTransportError, APIConnectionError, APITimeoutError } from "actos";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, type Locale, t } from "@/lib/i18n";

export const ACTOS_ERROR_CODES = [
  "VALIDATION_FAILED",
  "INVALID_CURSOR",
  "MISSING_CREDENTIALS",
  "INVALID_KEY",
  "FORBIDDEN",
  "BANNED",
  "NOT_FOUND",
  "CONFLICT",
  "GONE",
  "UNSUPPORTED_MEDIA",
  "RATE_LIMITED",
  "INTERNAL",
] as const;

export type ActosErrorCode = (typeof ACTOS_ERROR_CODES)[number];

export function isActosErrorCode(code: unknown): code is ActosErrorCode {
  return typeof code === "string" && (ACTOS_ERROR_CODES as readonly string[]).includes(code);
}

/**
 * Maps a machine-readable Actos error code to a localized, safe user message.
 * Adheres to Plan §8: never blindly display raw server detail strings to users.
 */
export function mapErrorCodeToMessage(
  code?: string | null,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (!code) {
    return t("errors.UNKNOWN_ERROR", undefined, locale);
  }

  const upperCode = code.toUpperCase();
  const translationKey = `errors.${upperCode}`;
  const translated = t(translationKey, undefined, locale);

  // If translation succeeded (did not just return the key itself), return it
  if (translated !== translationKey) {
    return translated;
  }

  return t("errors.UNKNOWN_ERROR", undefined, locale);
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  requestId?: string | null;
  [key: string]: unknown;
}

/**
 * Standard RFC 9457 Problem Details -> JSON error response generator for route handlers.
 * Guarantees strict Cache-Control: private headers to prevent sensitive data caching.
 */
export function apiErrorResponse(
  error: unknown,
  options?: {
    locale?: Locale;
    status?: number;
    fallbackMessage?: string;
  },
): NextResponse<ProblemDetails> {
  const locale = options?.locale || DEFAULT_LOCALE;

  let status = options?.status || 500;
  let code = "INTERNAL";
  let requestId: string | null = null;

  if (error instanceof ActosAPIError) {
    status = error.status;
    code = String(error.code || "INTERNAL");
    requestId = error.requestId || null;
  } else if (error instanceof APITimeoutError) {
    status = 408;
    code = "TIMEOUT_ERROR";
  } else if (error instanceof APIConnectionError || error instanceof ActosTransportError) {
    status = 503;
    code = "NETWORK_ERROR";
  } else if (error && typeof error === "object") {
    const candidate = error as {
      status?: number;
      code?: string;
      requestId?: string;
    };
    if (typeof candidate.status === "number") {
      status = candidate.status;
    }
    if (typeof candidate.code === "string") {
      code = candidate.code;
    }
    if (typeof candidate.requestId === "string") {
      requestId = candidate.requestId;
    }
  }

  // Plan §8: detail is converted to localized message; never blindly trust raw detail
  const detail =
    mapErrorCodeToMessage(code, locale) ||
    options?.fallbackMessage ||
    "An unexpected error occurred.";

  const problem: ProblemDetails = {
    type: `https://actos.dev/errors/${code.toLowerCase().replaceAll("_", "-")}`,
    title: code,
    status,
    code,
    detail,
    ...(requestId ? { requestId } : {}),
  };

  return NextResponse.json(problem, {
    status,
    headers: {
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "Content-Type": "application/problem+json",
    },
  });
}
