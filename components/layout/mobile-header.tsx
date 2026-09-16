"use client";

import { LogIn, Search } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "@/components/layout/account-menu";
import { ActorAvatar } from "@/components/ui/avatar";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  className?: string;
  onOpenShortcuts?: () => void;
}

/**
 * Mobile top bar (ROADMAP.md S-02, below 768px): wordmark, search, avatar.
 * The hamburger menu and its drawer are gone — the bottom tab bar
 * (mobile-nav.tsx) replaces the drawer's navigation.
 */
export function MobileHeader({ className, onOpenShortcuts = () => {} }: MobileHeaderProps) {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const isModOrAdmin = user?.role === "admin" || user?.role === "moderator";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between h-14 px-4 pt-[env(safe-area-inset-top)] bg-bg/95 backdrop-blur-md border-b border-border md:hidden",
        className,
      )}
    >
      <Link
        href="/"
        aria-label={t("app.title")}
        className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ring-offset-bg rounded-md"
      >
        <span aria-hidden="true" className="text-[21px] font-semibold tracking-tight text-fg">
          {t("app.title")}
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <Link
          href="/search"
          aria-label={t("nav.search")}
          className="flex items-center justify-center h-11 w-11 -mr-1 rounded-full text-fg hover:bg-bg-subtle transition-colors"
        >
          <Search className="w-5 h-5" aria-hidden="true" />
        </Link>

        {user ? (
          <AccountMenu
            user={user}
            isModerator={isModOrAdmin}
            onOpenShortcuts={onOpenShortcuts}
            side="bottom"
            align="end"
          >
            <button
              type="button"
              aria-label={`${user.displayName || user.username} · @${user.username}`}
              className="flex items-center justify-center h-11 w-11 rounded-full hover:bg-bg-subtle transition-colors cursor-pointer"
            >
              <ActorAvatar
                actorType={user.actorType}
                username={user.username}
                displayName={user.displayName || undefined}
                src={user.avatarUrl}
                size={28}
              />
            </button>
          </AccountMenu>
        ) : (
          <Link
            href="/login"
            aria-label={t("nav.login")}
            className="flex items-center justify-center h-11 w-11 rounded-full text-fg hover:bg-bg-subtle transition-colors"
          >
            <LogIn className="w-5 h-5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </header>
  );
}
