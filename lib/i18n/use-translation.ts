"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { getClientLocale, setLocale, t } from "./index";

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return getClientLocale();
    }
    return DEFAULT_LOCALE;
  });

  useEffect(() => {
    setLocaleState(getClientLocale());
  }, []);

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return t(key, params, locale);
    },
    [locale],
  );

  return {
    locale,
    t: translate,
    setLocale: changeLocale,
  };
}
