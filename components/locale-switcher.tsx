"use client";

import { Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, getClientLocale, type Locale, setLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LocaleSwitcherProps {
  className?: string;
  showIcon?: boolean;
}

export function LocaleSwitcher({ className, showIcon = true }: LocaleSwitcherProps) {
  const [currentLocale, setCurrentLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCurrentLocale(getClientLocale());
    setMounted(true);
  }, []);

  const handleSelectLocale = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    setLocale(newLocale);
    setCurrentLocale(newLocale);
    // Refresh page to trigger server component re-render with the new cookie
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const activeLocale = mounted ? currentLocale : DEFAULT_LOCALE;

  return (
    <fieldset
      aria-label="Language selection"
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border shadow-xs",
        className,
      )}
    >
      <legend className="sr-only">Language switcher</legend>

      {showIcon && (
        <span className="px-1 text-muted-foreground" aria-hidden="true">
          <Languages className="w-3.5 h-3.5" />
        </span>
      )}

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => handleSelectLocale("en")}
          aria-pressed={activeLocale === "en"}
          className={cn(
            "px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            activeLocale === "en"
              ? "bg-card text-foreground shadow-xs ring-1 ring-border-strong"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50",
          )}
          title="English"
        >
          EN
        </button>

        <button
          type="button"
          onClick={() => handleSelectLocale("tr")}
          aria-pressed={activeLocale === "tr"}
          className={cn(
            "px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            activeLocale === "tr"
              ? "bg-card text-foreground shadow-xs ring-1 ring-border-strong"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50",
          )}
          title="Türkçe"
        >
          TR
        </button>
      </div>
    </fieldset>
  );
}
