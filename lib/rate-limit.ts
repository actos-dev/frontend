import { type Locale, t } from "@/lib/i18n";

/**
 * Parses a `Retry-After` value into whole seconds. The header is either
 * delta-seconds (`"40"`) or an HTTP-date; both are accepted, per RFC 9110.
 * Returns `null` when the value is missing or unparsable.
 */
export function parseRetryAfterSeconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.ceil((parsed - Date.now()) / 1000));
}

/**
 * The single, localized message a rate-limited user sees. This is the one
 * place the `Retry-After` seconds become text, so every surface — the BFF's
 * problem body and the browser's `readApiJson` — presents the same wording.
 *
 * Falls back to the generic `errors.RATE_LIMITED` string when the server did
 * not send a usable `Retry-After`. When `locale` is omitted, `t` resolves the
 * active locale (cookie on the client, default on the server).
 */
export function rateLimitMessage(
  retryAfterSeconds: number | null | undefined,
  locale?: Locale,
): string {
  if (typeof retryAfterSeconds === "number" && retryAfterSeconds > 0) {
    return t("errors.rateLimited_retry", { seconds: retryAfterSeconds }, locale);
  }
  return t("errors.RATE_LIMITED", undefined, locale);
}
