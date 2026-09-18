import type { Locale } from "@/lib/i18n";

/**
 * Locale-aware date and number formatting for the community screens. Every
 * count and date goes through `Intl`, keyed by the active locale, rather than
 * hand-built strings (ROADMAP.md I-01, §1.5 X-02/X-05).
 */

function intlLocale(locale: Locale): string {
  return locale === "tr" ? "tr-TR" : "en-US";
}

/** Formats a member/post count with the active locale's grouping. */
export function formatCount(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

/** Formats a community's creation date, e.g. "18 September 2026". */
export function formatCommunityDate(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Formats a member's join date for the about page. */
export function formatMemberSince(value: string | Date, locale: Locale): string {
  return formatCommunityDate(value, locale);
}
