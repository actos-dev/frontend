"use client";

import { Check, Laptop, Moon, Sun, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useThemeStore } from "@/lib/stores/theme-store";
import { DEFAULT_THEME, THEME_NAMES, type ThemeName } from "@/lib/themes";
import { cn } from "@/lib/utils";

interface ThemeSwitcherProps {
  className?: string;
  showLabels?: boolean;
}

const ICONS: Record<ThemeName, typeof Laptop> = {
  system: Laptop,
  sepia: SunMedium,
  light: Sun,
  dark: Moon,
};

const LABEL_KEYS: Record<ThemeName, string> = {
  system: "appearance.system",
  sepia: "appearance.sepia",
  light: "appearance.light",
  dark: "appearance.dark",
};

/**
 * Compact 4-option theme control: System, Sepia, Light, Dark (ROADMAP F-05).
 * The old 22-theme gallery is gone; density and theme are the entire
 * appearance menu now (ROADMAP §1.3).
 */
export function ThemeSwitcher({ className, showLabels = true }: ThemeSwitcherProps) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? currentTheme : DEFAULT_THEME;

  return (
    <fieldset
      className={cn(
        "inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-bg-subtle border border-border",
        className,
      )}
    >
      <legend className="sr-only">{t("appearance.label")}</legend>

      {THEME_NAMES.map((name) => {
        const Icon = ICONS[name];
        const isActive = activeTheme === name;
        const label = t(LABEL_KEYS[name]);

        return (
          <button
            key={name}
            type="button"
            onClick={() => setTheme(name)}
            aria-pressed={isActive}
            title={label}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
              isActive
                ? "bg-bg text-fg shadow-xs ring-1 ring-border-strong"
                : "text-fg-muted hover:text-fg hover:bg-bg/60",
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {showLabels && <span>{label}</span>}
            {isActive && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
          </button>
        );
      })}
    </fieldset>
  );
}
