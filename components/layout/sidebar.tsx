"use client";

import {
  Bell,
  Bookmark,
  Home,
  LogIn,
  PenSquare,
  Search,
  Settings as SettingsIcon,
  Shield,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { AccountMenu } from "@/components/layout/account-menu";
import { ActorAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { useTranslation } from "@/lib/i18n";
import { type SessionUser, useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  user?: SessionUser | null;
  unreadCount?: number;
  onNavigate?: () => void;
  onOpenShortcuts?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number | string | null;
  conditional?: "authenticated" | "moderator";
}

/**
 * Desktop left nav (ROADMAP.md S-01). 240px with labels at >=1280px, a 72px
 * icon rail from 768px up to that. Below 768px it isn't rendered at all —
 * the mobile top bar and tab bar (mobile-header.tsx, mobile-nav.tsx) take
 * over instead.
 */
export function Sidebar({
  className,
  user: propUser,
  unreadCount: propUnreadCount,
  onNavigate,
  onOpenShortcuts = () => {},
}: SidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const storeUser = useSessionStore((state) => state.user);
  const storeUnreadCount = useSessionStore((state) => state.unreadCount);

  const currentUser = propUser !== undefined ? propUser : storeUser;
  const currentUnread = propUnreadCount !== undefined ? propUnreadCount : storeUnreadCount;

  const isAuth = !!currentUser;
  const isModOrAdmin = currentUser?.role === "admin" || currentUser?.role === "moderator";

  const navItems: NavItem[] = [
    { label: t("nav.feed"), href: "/", icon: Home },
    { label: t("nav.search"), href: "/search", icon: Search },
    {
      label: t("nav.notifications"),
      href: "/inbox",
      icon: Bell,
      badge: currentUnread > 0 ? (currentUnread > 99 ? "99+" : currentUnread) : null,
      conditional: "authenticated",
    },
    { label: t("nav.saved"), href: "/saved", icon: Bookmark },
    {
      label: t("nav.profile"),
      href: currentUser?.username ? `/u/${currentUser.username}` : "/me",
      icon: UserRound,
      conditional: "authenticated",
    },
    {
      label: t("nav.moderation"),
      href: "/mod",
      icon: Shield,
      conditional: "moderator",
    },
    {
      label: t("nav.settings"),
      href: "/settings",
      icon: SettingsIcon,
      conditional: "authenticated",
    },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.conditional === "authenticated") return isAuth;
    if (item.conditional === "moderator") return isModOrAdmin;
    return true;
  });

  const accountLabel = currentUser
    ? `${currentUser.displayName || currentUser.username} · @${currentUser.username}`
    : "";

  return (
    <aside
      className={cn(
        "flex h-full flex-col justify-between py-4 px-2.5 xl:px-4 bg-bg select-none",
        className,
      )}
    >
      <div className="space-y-5 min-w-0">
        {/* Wordmark — no ✦ glyph, no v0.1 badge (ROADMAP K-07) */}
        <div className="px-1 xl:px-2 flex justify-center xl:justify-start">
          <Link
            href="/"
            onClick={onNavigate}
            aria-label={t("app.title")}
            className="inline-flex items-baseline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ring-offset-bg rounded-md"
          >
            <span
              aria-hidden="true"
              className="hidden xl:inline text-[22px] font-semibold tracking-tight text-fg"
            >
              {t("app.title")}
            </span>
            <span
              aria-hidden="true"
              className="xl:hidden text-[22px] font-semibold tracking-tight text-fg"
            >
              {t("app.title").slice(0, 1).toLowerCase()}
            </span>
          </Link>
        </div>

        <nav className="space-y-0.5" aria-label={t("nav.mainLabel")}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-2.5 xl:px-3 py-2 text-[15px] justify-center xl:justify-start transition-colors",
                  isActive
                    ? "text-fg font-semibold"
                    : "text-fg-muted hover:text-fg hover:bg-bg-subtle",
                )}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"
                  />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                <span aria-hidden="true" className="hidden xl:inline truncate">
                  {item.label}
                </span>

                {item.badge != null && (
                  <span
                    role="status"
                    data-testid="inbox-badge"
                    aria-label={t("nav.unreadBadge", { count: String(item.badge) })}
                    className="hidden xl:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 ml-auto text-[11px] font-semibold font-mono rounded-full bg-accent text-on-accent"
                  >
                    {item.badge}
                  </span>
                )}
                {item.badge != null && (
                  <span
                    aria-hidden="true"
                    className="xl:hidden absolute top-1 right-2 h-2 w-2 rounded-full bg-accent"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Primary "New post" button */}
        <div className="pt-1 px-0.5">
          <Button asChild size="md" className="w-full justify-center xl:justify-start gap-2">
            <Link href="/new" onClick={onNavigate} aria-label={t("nav.newPost")}>
              <PenSquare className="w-4 h-4" aria-hidden="true" />
              <span aria-hidden="true" className="hidden xl:inline">
                {t("nav.newPost")}
              </span>
            </Link>
          </Button>
        </div>

        {/* Communities section (ROADMAP §3): hidden behind FEATURE_COMMUNITIES
            until the Phase 7 API lands. Only shown at the full nav width —
            the icon rail has no room for a labeled section. */}
        {FEATURE_COMMUNITIES && (
          <div className="hidden xl:block pt-2">
            <div className="flex items-center justify-between px-2.5 pb-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                {t("nav.communities")}
              </span>
            </div>
            <Link
              href="/communities"
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
            >
              {t("nav.browseCommunities")}
            </Link>
            <Link
              href="/communities/new"
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors"
            >
              {t("nav.createCommunity")}
            </Link>
          </div>
        )}
      </div>

      {/* Account block: theme, language and log out live in the menu now
          (ROADMAP S-01) — the old sidebar "Görünüm" box is gone (K-06), and
          so is the signed-out "Fikrini paylaş" box (K-09). */}
      <div className="pt-3 border-t border-border px-0.5">
        {currentUser ? (
          <AccountMenu
            user={currentUser}
            isModerator={isModOrAdmin}
            onOpenShortcuts={onOpenShortcuts}
            side="top"
            align="start"
          >
            <button
              type="button"
              aria-label={accountLabel}
              className="flex w-full items-center gap-2.5 rounded-md p-1.5 xl:p-2 hover:bg-bg-subtle transition-colors cursor-pointer justify-center xl:justify-start"
            >
              <ActorAvatar
                actorType={currentUser.actorType}
                username={currentUser.username}
                displayName={currentUser.displayName || undefined}
                src={currentUser.avatarUrl}
                size={28}
              />
              <span
                aria-hidden="true"
                className="hidden xl:flex min-w-0 flex-1 flex-col items-start text-left"
              >
                <span className="text-sm font-semibold text-fg truncate w-full">
                  {currentUser.displayName || currentUser.username}
                </span>
                <span className="text-xs font-mono text-fg-subtle truncate w-full">
                  @{currentUser.username}
                </span>
              </span>
            </button>
          </AccountMenu>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="w-full justify-center xl:justify-start gap-2"
            >
              <Link href="/login" onClick={onNavigate} aria-label={t("nav.login")}>
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span aria-hidden="true" className="hidden xl:inline">
                  {t("nav.login")}
                </span>
              </Link>
            </Button>
            <Button asChild size="sm" className="w-full justify-center xl:justify-start gap-2">
              <Link href="/register" onClick={onNavigate} aria-label={t("nav.register")}>
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span aria-hidden="true" className="hidden xl:inline">
                  {t("nav.register")}
                </span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
