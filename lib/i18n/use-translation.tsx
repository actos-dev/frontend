"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { getClientLocale, setLocale as setCookieLocale, t as translate } from "./index";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const defaultSetLocale = (newLocale: Locale) => {
  setCookieLocale(newLocale);
};

const defaultTranslate = (key: string, params?: Record<string, string | number>) => {
  const activeLocale = typeof window !== "undefined" ? getClientLocale() : DEFAULT_LOCALE;
  return translate(key, params, activeLocale);
};

const defaultFallbackValue: I18nContextValue = {
  get locale() {
    return typeof window !== "undefined" ? getClientLocale() : DEFAULT_LOCALE;
  },
  setLocale: defaultSetLocale,
  t: defaultTranslate,
};

const I18nContext = createContext<I18nContextValue>(defaultFallbackValue);

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const changeLocale = useCallback((newLocale: Locale) => {
    setCookieLocale(newLocale);
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(key, params, locale);
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale: changeLocale,
      t,
    }),
    [locale, changeLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  return useContext(I18nContext);
}
