"use client";

import { Bell, Home, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileComposeSheet } from "@/components/editor/mobile-compose-sheet";
import { ActorAvatar } from "@/components/ui/avatar";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  className?: string;
}

/**
 * Mobile bottom tab bar (ROADMAP.md S-02, below 768px): Home, Search,
 * Compose (centre), Inbox (unread dot), Profile. Every target is at least
 * 44px and the bar respects the safe-area inset. Replaces the deleted
 * hamburger drawer entirely.
 */
export function MobileNav({ className }: MobileNavProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const user = useSessionStore((state) => state.user);
  const unreadCount = useSessionStore((state) => state.unreadCount);

  const isHomeActive = pathname === "/";
  const isSearchActive = pathname === "/search" || pathname?.startsWith("/tags");
  const isNewActive = pathname === "/new";
  const isInboxActive = pathname === "/inbox";
  const isProfileActive =
    (user && (pathname === "/me" || pathname === `/u/${user.username}`)) ||
    (!user && pathname === "/login");

  const profileHref = user ? (user.username ? `/u/${user.username}` : "/me") : "/login";

  return (
    <nav
      aria-label={t("nav.mobileTabBarLabel")}
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 h-16 bg-bg/95 backdrop-blur-md border-t border-border md:hidden flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      <Link
        href="/"
        aria-current={isHomeActive ? "page" : undefined}
        aria-label={t("nav.feed")}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-11 transition-colors",
          isHomeActive ? "text-fg" : "text-fg-muted hover:text-fg",
        )}
      >
        <Home className="w-5 h-5" aria-hidden="true" />
      </Link>

      <Link
        href="/search"
        aria-current={isSearchActive ? "page" : undefined}
        aria-label={t("nav.search")}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-11 transition-colors",
          isSearchActive ? "text-fg" : "text-fg-muted hover:text-fg",
        )}
      >
        <Search className="w-5 h-5" aria-hidden="true" />
      </Link>

      <div className="flex-1 flex items-center justify-center">
        {user ? (
          <MobileComposeSheet />
        ) : (
          <Link
            href="/login?returnUrl=/new"
            aria-current={isNewActive ? "page" : undefined}
            aria-label={t("nav.newPost")}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-fg text-bg active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
          </Link>
        )}
      </div>

      <Link
        href={user ? "/inbox" : "/login?returnUrl=/inbox"}
        aria-current={isInboxActive ? "page" : undefined}
        aria-label={
          unreadCount > 0
            ? t("nav.notificationsUnread", { count: String(unreadCount) })
            : t("nav.notifications")
        }
        className={cn(
          "relative flex flex-col items-center justify-center flex-1 h-11 transition-colors",
          isInboxActive ? "text-fg" : "text-fg-muted hover:text-fg",
        )}
      >
        <div className="relative">
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              data-testid="mobile-inbox-badge"
              aria-hidden="true"
              className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-on-accent text-[9px] font-bold flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </Link>

      <Link
        href={profileHref}
        aria-current={isProfileActive ? "page" : undefined}
        aria-label={user ? t("nav.profile") : t("nav.login")}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-11 transition-colors",
          isProfileActive ? "text-fg" : "text-fg-muted hover:text-fg",
        )}
      >
        {user ? (
          <ActorAvatar
            actorType={user.actorType}
            username={user.username}
            displayName={user.displayName || undefined}
            src={user.avatarUrl}
            size={20}
          />
        ) : (
          <User className="w-5 h-5" aria-hidden="true" />
        )}
      </Link>
    </nav>
  );
}
