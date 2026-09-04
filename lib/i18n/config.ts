export const LOCALES = ["en", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "actos_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}
