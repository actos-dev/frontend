import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { getDictionary } from "./dictionaries";

export * from "./config";
export * from "./dictionaries";
export { useTranslation } from "./use-translation";

/**
 * Reads the active locale from browser cookies synchronously.
 */
export function getClientLocale(): Locale {
  if (typeof document === "undefined") {
    return DEFAULT_LOCALE;
  }
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
    const val = match ? decodeURIComponent(match[1]) : null;
    if (isLocale(val)) {
      return val;
    }
  } catch {
    // Ignore cookie parsing error
  }
  return DEFAULT_LOCALE;
}

/**
 * Reads the active locale from incoming Next.js request cookies on the server.
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(LOCALE_COOKIE)?.value || cookieStore.get("locale")?.value;
    if (isLocale(token)) {
      return token;
    }
  } catch {
    // cookies() may throw outside Next.js request context (e.g. tests or build)
  }
  return DEFAULT_LOCALE;
}

/**
 * Universal helper to get the active locale on both server and client.
 */
export async function getLocale(): Promise<Locale> {
  if (typeof window !== "undefined") {
    return getClientLocale();
  }
  return getServerLocale();
}

/**
 * Sets the active locale cookie (persisted for 1 year, Lax, root path).
 */
export function setLocale(locale: Locale): void {
  if (!isLocale(locale)) {
    return;
  }
  if (typeof document !== "undefined") {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

/**
 * Translates a dot-notated key with optional interpolation.
 * Fallback precedence: Requested locale -> English dictionary -> Raw key string.
 */
export function t(key: string, params?: Record<string, string | number>, locale?: Locale): string {
  const activeLocale =
    locale || (typeof window !== "undefined" ? getClientLocale() : DEFAULT_LOCALE);
  const dict = getDictionary(activeLocale);

  const keys = key.split(".");
  let current: unknown = dict;

  for (const segment of keys) {
    if (current && typeof current === "object" && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      current = undefined;
      break;
    }
  }

  // If missing in current language and current language is not English, fall back to English
  if (typeof current !== "string" && activeLocale !== DEFAULT_LOCALE) {
    const enDict = getDictionary(DEFAULT_LOCALE);
    let enCurrent: unknown = enDict;
    for (const segment of keys) {
      if (
        enCurrent &&
        typeof enCurrent === "object" &&
        segment in (enCurrent as Record<string, unknown>)
      ) {
        enCurrent = (enCurrent as Record<string, unknown>)[segment];
      } else {
        enCurrent = undefined;
        break;
      }
    }
    if (typeof enCurrent === "string") {
      current = enCurrent;
    }
  }

  if (typeof current !== "string") {
    return key;
  }

  let text = current;
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replaceAll(`{${paramKey}}`, String(paramValue));
    }
  }

  return text;
}

/**
 * Server-side / static helper returning bound translation functions for a specific locale.
 */
export function getTranslations(locale: Locale = DEFAULT_LOCALE) {
  return {
    locale,
    t: (key: string, params?: Record<string, string | number>) => t(key, params, locale),
    dictionary: getDictionary(locale),
  };
}
