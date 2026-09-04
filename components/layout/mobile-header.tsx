"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  className?: string;
  onOpenMenu: () => void;
}

export function MobileHeader({ className, onOpenMenu }: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-background/90 backdrop-blur-md border-b border-border/80 md:hidden",
        className,
      )}
    >
      {/* Sol: Menü Açıcı Buton */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Menüyü aç"
        className="p-2 -ml-2 rounded-xl text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Orta: Actos Marka Logosu */}
      <Link
        href="/"
        className="flex items-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-2 py-1"
      >
        <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-serif font-black text-sm shadow-xs">
          ✦
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground font-serif">Actos</span>
      </Link>

      {/* Sağ: Tema Seçici (Kompakt) */}
      <div className="flex items-center -mr-1">
        <ThemeSwitcher showLabels={false} className="scale-90 origin-right" />
      </div>
    </header>
  );
}
