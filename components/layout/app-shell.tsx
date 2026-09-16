"use client";

import * as React from "react";
import { CommandPalette } from "@/components/command/command-palette";
import { ShortcutsDialog } from "@/components/keyboard/shortcuts-dialog";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { SiteFooter } from "@/components/layout/site-footer";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  /** The `@rightrail` parallel-route slot (ROADMAP.md S-03): real, per-page
   * content — home tags/new actors, a post's author card, a tag's post
   * count, or the footer-only default for every other page. */
  rightRail?: React.ReactNode;
}

/**
 * The app shell (ROADMAP.md §1.3, S-01/S-02/S-06): a 240px left nav, a
 * 680px centre column and a 320px contextual right rail at >=1280px; the
 * nav collapses to a 72px icon rail from 768px up to that; the right rail
 * disappears below 1024px; below 768px a mobile top bar and bottom tab bar
 * take over entirely.
 */
export function AppShell({ children, rightRail = null }: AppShellProps) {
  const { t } = useTranslation();
  const { shortcutsDialogOpen, setShortcutsDialogOpen } = useKeyboardShortcuts();
  const openShortcuts = React.useCallback(
    () => setShortcutsDialogOpen(true),
    [setShortcutsDialogOpen],
  );

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col justify-start w-full">
      <ShortcutsDialog open={shortcutsDialogOpen} onOpenChange={setShortcutsDialogOpen} />
      <CommandPalette />

      {/* Mobile top bar (<768px) */}
      <MobileHeader onOpenShortcuts={openShortcuts} />

      <div className="flex w-full max-w-[1320px] justify-center mx-auto min-h-screen">
        {/* Left nav: hidden below 768px, a 72px icon rail up to 1280px, 240px above it */}
        <div className="hidden md:flex md:w-[72px] xl:w-[240px] shrink-0 sticky top-0 h-screen border-r border-border z-20">
          <Sidebar className="w-full" onOpenShortcuts={openShortcuts} />
        </div>

        {/* Centre column: no card frame, hairlines only (ROADMAP §1.1 rule 1) */}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "flex-1 w-full min-w-0 pb-20 md:pb-10 min-h-screen focus:outline-hidden",
            "max-w-[680px] border-border border-r-0 lg:border-r",
          )}
        >
          {children}
          {/* Footer for every breakpoint that has no visible right rail
              (<1024px) — the rail itself carries the footer at >=1024px. */}
          <SiteFooter t={t} className="lg:hidden px-4 sm:px-6" />
        </main>

        {/* Right rail: hidden below 1024px, real per-page content above it */}
        <div className="hidden lg:block lg:w-[300px] xl:w-[320px] shrink-0 sticky top-0 max-h-screen overflow-y-auto z-10">
          {rightRail}
        </div>
      </div>

      {/* Mobile bottom tab bar (<768px) */}
      <MobileNav />
    </div>
  );
}
