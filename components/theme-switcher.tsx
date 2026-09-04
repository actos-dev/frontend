"use client";

import { BookOpen, Check, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";
import {
  DEFAULT_THEME,
  isValidTheme,
  OTHER_THEMES,
  PRIMARY_THEMES,
  type ThemeName,
  themes,
} from "@/lib/themes";

interface ThemeSwitcherProps {
  className?: string;
  showLabels?: boolean;
}

export function ThemeSwitcher({ className = "", showLabels = true }: ThemeSwitcherProps) {
  const currentTheme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [mounted, setMounted] = useState(false);
  const selectId = useId();

  // Hydration sonrası DOM ile senkronize ol
  useEffect(() => {
    setMounted(true);
    const domTheme = document.documentElement.getAttribute("data-theme");
    if (domTheme && isValidTheme(domTheme) && domTheme !== currentTheme) {
      setTheme(domTheme as ThemeName);
    }
  }, [currentTheme, setTheme]);

  const activeTheme = mounted ? currentTheme : DEFAULT_THEME;
  const isOtherSelected = OTHER_THEMES.some((t) => t.id === activeTheme);

  const getPrimaryIcon = (id: ThemeName) => {
    switch (id) {
      case "sepia":
        return <BookOpen className="w-3.5 h-3.5" />;
      case "light":
        return <Sun className="w-3.5 h-3.5" />;
      case "florence":
        return <Moon className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  return (
    <fieldset
      className={`inline-flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface-2 border border-border shadow-xs ${className}`}
    >
      <legend className="sr-only">Tema seçici</legend>

      {/* Ana Üçlü Hızlı Erişim Butonları */}
      <div className="flex items-center gap-1">
        {PRIMARY_THEMES.map((t) => {
          const isActive = activeTheme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-card text-foreground shadow-xs ring-1 ring-border-strong"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
              title={`${t.name} (${t.description})`}
              aria-pressed={isActive}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: t.preview.primary }}
                aria-hidden="true"
              />
              {getPrimaryIcon(t.id)}
              {showLabels && <span>{t.name}</span>}
              {isActive && <Check className="w-3 h-3 text-primary ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Dikey Ayırıcı Çizgi */}
      <div className="w-px h-4 bg-border mx-0.5" aria-hidden="true" />

      {/* Kalan 19 Tema Açılır Menüsü */}
      <div className="relative flex items-center">
        <label htmlFor={selectId} className="sr-only">
          Diğer temalar
        </label>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isOtherSelected
              ? "bg-card text-foreground shadow-xs ring-1 ring-border-strong"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <Palette className="w-3.5 h-3.5 shrink-0 text-primary" />
          <select
            id={selectId}
            value={isOtherSelected ? activeTheme : ""}
            onChange={(e) => {
              if (e.target.value && isValidTheme(e.target.value)) {
                setTheme(e.target.value);
              }
            }}
            className="bg-transparent text-xs font-medium text-foreground outline-hidden cursor-pointer pr-1 appearance-none focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
            aria-label="Diğer temalar listesi"
          >
            <option value="" disabled className="bg-card text-foreground">
              {isOtherSelected ? themes[activeTheme]?.name || "Diğer Tema" : "Daha fazla tema..."}
            </option>
            {OTHER_THEMES.map((t) => (
              <option key={t.id} value={t.id} className="bg-card text-foreground py-1">
                {t.name} ({t.mode === "dark" ? "Koyu" : "Açık"})
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}
