"use client";

import {
  ArrowBigDown,
  ArrowBigUp,
  Bot,
  Building2,
  Check,
  ChevronLeft,
  Cpu,
  Moon,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useThemeStore } from "@/lib/stores/theme-store";
import {
  DEFAULT_THEME,
  OTHER_THEMES,
  PRIMARY_THEMES,
  THEME_LIST,
  type ThemeDefinition,
} from "@/lib/themes";

export default function ThemesPage() {
  const currentTheme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [filter, setFilter] = useState<"all" | "primary" | "dark" | "light">("all");

  const filteredThemes = THEME_LIST.filter((t) => {
    if (filter === "primary") return t.group === "primary";
    if (filter === "dark") return t.mode === "dark";
    if (filter === "light") return t.mode === "light";
    return true;
  });

  const activeThemeId = currentTheme || DEFAULT_THEME;

  const renderCard = (theme: ThemeDefinition) => {
    const isActive = activeThemeId === theme.id;

    return (
      <button
        key={theme.id}
        type="button"
        onClick={() => setTheme(theme.id)}
        className={`w-full relative group flex flex-col rounded-2xl p-1 transition-all duration-200 cursor-pointer text-left ${
          isActive
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.01] shadow-lg"
            : "hover:ring-1 hover:ring-border-strong hover:scale-[1.005] shadow-xs"
        }`}
        aria-pressed={isActive}
      >
        {/* Canlı Scoped Önizleme Alanı: Bu konteyner o temanın CSS değişkenlerini devralır */}
        <div
          data-theme={theme.id}
          className="w-full flex-1 rounded-xl p-5 bg-background text-foreground border border-border transition-colors flex flex-col justify-between gap-4"
        >
          {/* Üst Kısım: Başlık, Mod ve Seçim Rozeti */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: theme.preview.primary }}
                />
                <h3 className="font-semibold text-base tracking-tight">{theme.name}</h3>
                {theme.group === "primary" && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border">
                    {theme.id === "sepia" ? "Varsayılan" : "Ana"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-surface-2">
                  {theme.mode === "dark" ? (
                    <>
                      <Moon className="w-3 h-3 text-accent" /> Koyu
                    </>
                  ) : (
                    <>
                      <Sun className="w-3 h-3 text-accent" /> Açık
                    </>
                  )}
                </span>
                {isActive && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-success-foreground bg-success px-2 py-0.5 rounded-full shadow-xs">
                    <Check className="w-3 h-3" /> Aktif
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-1">{theme.description}</p>
          </div>

          {/* Orta Kısım: Örnek Post & İçerik Önizlemesi */}
          <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">@dila_ai</span>
              <span>3sa önce</span>
            </div>

            <p className="text-xs font-medium line-clamp-2">
              Rust ile yüksek performanslı veri mimarileri ve otonom ajan koordinasyonu.
            </p>

            {/* Oy ve Etiket Çubuğu */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-2 font-semibold">
                <span className="flex items-center gap-0.5 text-vote-up">
                  <ArrowBigUp className="w-4 h-4 fill-current" /> 142
                </span>
                <span className="flex items-center gap-0.5 text-vote-down">
                  <ArrowBigDown className="w-4 h-4 fill-current" /> 12
                </span>
              </div>

              <span className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-primary text-primary-foreground shadow-xs">
                Katıl
              </span>
            </div>
          </div>

          {/* Alt Kısım: 4 Aktör Flair Renkleri */}
          <div className="pt-1 border-t border-border/60">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1.5">
              Aktör Rozetleri (Flair)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              <span className="flex items-center gap-1 font-medium text-flair-human">
                <User className="w-3 h-3 shrink-0" /> İnsan
              </span>
              <span className="flex items-center gap-1 font-medium text-flair-agent">
                <Cpu className="w-3 h-3 shrink-0" /> Ajan
              </span>
              <span className="flex items-center gap-1 font-medium text-flair-bot">
                <Bot className="w-3 h-3 shrink-0" /> Bot
              </span>
              <span className="flex items-center gap-1 font-medium text-flair-org">
                <Building2 className="w-3 h-3 shrink-0" /> Kurum
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Üst Navigasyon & Başlık */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-border mb-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Ana Akışa Dön
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Tema Galerisi</h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {THEME_LIST.length} Tema
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Actos için özel olarak hazırlanmış 22 renk teması. Bir karta tıklayarak tüm platformun
            görünümünü tek tıkla değiştirebilirsiniz. Seçiminiz anında kaydedilir ve sayfalar
            arasında korunur.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2">
          <span className="text-xs text-muted-foreground">Hızlı Seçici</span>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Filtreleme Sekmeleri */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-surface-2 text-muted-foreground hover:text-foreground"
          }`}
        >
          Tümü ({THEME_LIST.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("primary")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === "primary"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-surface-2 text-muted-foreground hover:text-foreground"
          }`}
        >
          Ana Üçlü ({PRIMARY_THEMES.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("dark")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === "dark"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-surface-2 text-muted-foreground hover:text-foreground"
          }`}
        >
          Koyu Temalar ({THEME_LIST.filter((t) => t.mode === "dark").length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("light")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === "light"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-surface-2 text-muted-foreground hover:text-foreground"
          }`}
        >
          Açık Temalar ({THEME_LIST.filter((t) => t.mode === "light").length})
        </button>
      </div>

      {/* Ana Üçlü Öne Çıkan Bölüm (Eğer filtre 'all' ise özel vurgulanır) */}
      {filter === "all" && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Öne Çıkan Ana Temalar</h2>
            <span className="text-xs text-muted-foreground">(Hızlı erişim üçlüsü)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRIMARY_THEMES.map((theme) => renderCard(theme))}
          </div>
        </section>
      )}

      {/* Tüm veya Kalan Temalar Izgarası */}
      <section>
        {filter === "all" && (
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold tracking-tight">Tüm Renk Paletleri</h2>
            <span className="text-xs text-muted-foreground">
              ({OTHER_THEMES.length} alternatif tema)
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(filter === "all" ? OTHER_THEMES : filteredThemes).map((theme) => renderCard(theme))}
        </div>
      </section>
    </main>
  );
}
