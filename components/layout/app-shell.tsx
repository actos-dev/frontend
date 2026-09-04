"use client";

import { usePathname } from "next/navigation";
import * as React from "react";
import { ShortcutsDialog } from "@/components/keyboard/shortcuts-dialog";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RightRail } from "@/components/layout/right-rail";
import { Sidebar } from "@/components/layout/sidebar";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  rightRail?: React.ReactNode;
  hideRightRail?: boolean;
  wide?: boolean;
}

export function AppShell({
  children,
  rightRail,
  hideRightRail = false,
  wide = false,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const pathname = usePathname();
  const { shortcutsDialogOpen, setShortcutsDialogOpen } = useKeyboardShortcuts();

  // /themes veya /design gibi katalog sayfalarında sağ ray otomatik gizlenip geniş görünüm verilebilir
  const isCatalogRoute = pathname?.startsWith("/themes") || pathname?.startsWith("/design");
  const shouldHideRightRail = hideRightRail || (isCatalogRoute && !rightRail);
  const isWideContent = wide || isCatalogRoute;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-start w-full">
      {/* 0. Klavye Kısayolları Diyaloğu (Plan §10.3) */}
      <ShortcutsDialog open={shortcutsDialogOpen} onOpenChange={setShortcutsDialogOpen} />
      {/* 1. Mobil Üst Başlık (≤ 768px) */}
      <MobileHeader onOpenMenu={() => setDrawerOpen(true)} />

      {/* 2. Mobil Çekmece (Drawer) */}
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* 3. Ana Üç Kolon Izgara / Flex Taşıyıcı */}
      <div className="flex w-full max-w-[1340px] justify-center mx-auto min-h-screen">
        {/* Sol Kolon: Navigasyon (≥ 768px'de görünür, ~260px sabit) */}
        <div className="hidden md:flex w-[260px] shrink-0 sticky top-0 h-screen border-r border-border/70 z-20">
          <Sidebar className="w-full" />
        </div>

        {/* Orta Kolon: Ana İçerik ve Akış
            - Kart çerçevesi YOK; ince zarif ayıraçlar ve cömert boşluk (Plan §4.1 kuralı)
            - max 680-720px esnek genişlik
            - Mobilde tam genişlik, alttan sekme çubuğu boşluğu (pb-20)
        */}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "flex-1 w-full min-w-0 pb-20 md:pb-8 min-h-screen focus:outline-hidden",
            isWideContent ? "max-w-5xl px-4 sm:px-6" : "max-w-[720px] md:border-r border-border/70",
          )}
        >
          {children}
        </main>

        {/* Sağ Kolon: Popüler Etiketler & Tanıtım (≥ 1280px'de görünür, ~320px)
            - 768px–1279px arasında gizlenir (İki kolon düzeni)
            - Kota / rate-limit göstergesi içermez (Plan §4.1)
        */}
        {!shouldHideRightRail && (
          <div className="hidden xl:block w-[320px] shrink-0 sticky top-0 h-screen overflow-y-auto z-10">
            {rightRail || <RightRail />}
          </div>
        )}
      </div>

      {/* 4. Mobil Alt Sekme Çubuğu (≤ 768px) */}
      <MobileNav />
    </div>
  );
}
