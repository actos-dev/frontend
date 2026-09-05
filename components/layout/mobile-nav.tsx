"use client";

import { Bell, Home, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarActorBadge, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  className?: string;
}

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
      aria-label="Mobil Alt Sekme Çubuğu"
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 h-16 bg-background/95 backdrop-blur-md border-t border-border/80 md:hidden flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      {/* 1. Akış (Home) */}
      <Link
        href="/"
        aria-current={isHomeActive ? "page" : undefined}
        aria-label={t("nav.feed")}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors",
          isHomeActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span>{t("nav.feed")}</span>
      </Link>

      {/* 2. Arama (Search) */}
      <Link
        href="/search"
        aria-current={isSearchActive ? "page" : undefined}
        aria-label={t("nav.search")}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors",
          isSearchActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span>{t("nav.search")}</span>
      </Link>

      {/* 3. Yeni Post (Öne çıkan buton) */}
      <div className="flex-1 flex items-center justify-center">
        <Link
          href={user ? "/new" : "/login?returnUrl=/new"}
          aria-current={isNewActive ? "page" : undefined}
          aria-label={t("nav.newPost")}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </Link>
      </div>

      {/* 4. Bildirimler (Inbox) */}
      <Link
        href={user ? "/inbox" : "/login?returnUrl=/inbox"}
        aria-current={isInboxActive ? "page" : undefined}
        aria-label={
          unreadCount > 0
            ? `${t("nav.notifications")} (${unreadCount} okunmamış)`
            : t("nav.notifications")
        }
        className={cn(
          "relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors",
          isInboxActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <div className="relative">
          <Bell className="w-5 h-5 mb-0.5" />
          {unreadCount > 0 && (
            <span
              data-testid="mobile-inbox-badge"
              aria-hidden="true"
              className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shadow-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <span>{t("nav.notifications")}</span>
      </Link>

      {/* 5. Profil / Giriş */}
      <Link
        href={profileHref}
        aria-current={isProfileActive ? "page" : undefined}
        aria-label={user ? t("nav.profile") : t("nav.login")}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors",
          isProfileActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {user ? (
          <div className="relative mb-0.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <AvatarActorBadge actorType={user.actorType} size="sm" />
          </div>
        ) : (
          <User className="w-5 h-5 mb-0.5" />
        )}
        <span>{user ? t("nav.profile") : t("nav.login")}</span>
      </Link>
    </nav>
  );
}
