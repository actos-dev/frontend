import { DEFAULT_LOCALE, type Locale, t } from "@/lib/i18n";

/**
 * The error vocabulary shared by the server and the browser.
 *
 * It lives apart from `lib/errors.ts` because that module imports the Actos
 * SDK to recognise its error classes, and the SDK reaches for `node:fs` and
 * `node:path` when it resolves file uploads. A client component that pulled
 * this vocabulary through `lib/errors.ts` therefore dragged those Node
 * built-ins into the browser bundle and broke the build.
 */
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
