import { ActosAPIError, ActosTransportError, APIConnectionError, APITimeoutError } from "actos";
import { NextResponse } from "next/server";
import {
  ACTOS_ERROR_CODES,
  type ActosErrorCode,
  isActosErrorCode,
  mapErrorCodeToMessage,
} from "@/lib/error-codes";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

// Re-exported so existing server-side importers keep one entry point.
export { ACTOS_ERROR_CODES, type ActosErrorCode, isActosErrorCode, mapErrorCodeToMessage };

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  requestId?: string | null;
  [key: string]: unknown;
}

export interface ErrorDetails {
  status: number;
  code: string;
  requestId: string | null;
}

/**
 * Maps any thrown value (an SDK error instance, a plain `{status, code}`
 * object, or something unknown) to a stable `{status, code, requestId}`
 * triple. Shared by `apiErrorResponse` (route handlers, which turn this into
 * a problem+json body) and server pages that render `ErrorState` directly
 * instead of returning JSON — see ROADMAP.md P0-02.
 */
export function describeError(error: unknown, fallbackStatus = 500): ErrorDetails {
  if (error instanceof ActosAPIError) {
    return {
      status: error.status,
      code: String(error.code || "INTERNAL"),
      requestId: error.requestId || null,
    };
  }
  if (error instanceof APITimeoutError) {
    return { status: 408, code: "TIMEOUT_ERROR", requestId: null };
  }
  if (error instanceof APIConnectionError || error instanceof ActosTransportError) {
    return { status: 503, code: "NETWORK_ERROR", requestId: null };
  }
  if (error && typeof error === "object") {
    const candidate = error as { status?: number; code?: string; requestId?: string };
    return {
      status: typeof candidate.status === "number" ? candidate.status : fallbackStatus,
      code: typeof candidate.code === "string" ? candidate.code : "INTERNAL",
      requestId: typeof candidate.requestId === "string" ? candidate.requestId : null,
    };
  }
  return { status: fallbackStatus, code: "INTERNAL", requestId: null };
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

  const { status, code, requestId } = describeError(error, options?.status || 500);

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
