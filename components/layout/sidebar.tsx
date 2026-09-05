"use client";

import {
  Bell,
  Bookmark,
  Hash,
  Home,
  LogIn,
  LogOut,
  PenSquare,
  Search,
  Shield,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Avatar, AvatarActorBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { type SessionUser, useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  user?: SessionUser | null;
  unreadCount?: number;
  onNavigate?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string | null;
  conditional?: "authenticated" | "moderator";
}

export function Sidebar({
  className,
  user: propUser,
  unreadCount: propUnreadCount,
  onNavigate,
}: SidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const storeUser = useSessionStore((state) => state.user);
  const storeUnreadCount = useSessionStore((state) => state.unreadCount);
  const logout = useSessionStore((state) => state.logout);

  const currentUser = propUser !== undefined ? propUser : storeUser;
  const currentUnread = propUnreadCount !== undefined ? propUnreadCount : storeUnreadCount;

  const isAuth = !!currentUser;
  const isModOrAdmin = currentUser?.role === "admin" || currentUser?.role === "moderator";

  const handleLogout = () => {
    logout();
  };

  const navItems: NavItem[] = [
    { label: t("nav.feed"), href: "/", icon: Home },
    { label: t("nav.search"), href: "/search", icon: Search },
    { label: t("nav.tags"), href: "/tags", icon: Hash },
    { label: t("nav.saved"), href: "/saved", icon: Bookmark },
    {
      label: t("nav.notifications"),
      href: "/inbox",
      icon: Bell,
      badge: currentUnread > 0 ? (currentUnread > 99 ? "99+" : currentUnread) : null,
      conditional: "authenticated",
    },
    {
      label: t("nav.moderation"),
      href: "/mod",
      icon: Shield,
      conditional: "moderator",
    },
  ];

  // Filtrelenmiş menü öğeleri
  const visibleItems = navItems.filter((item) => {
    if (item.conditional === "authenticated") return isAuth;
    if (item.conditional === "moderator") return isModOrAdmin;
    return true;
  });

  return (
    <aside
      aria-label="Sol Navigasyon"
      className={cn(
        "flex flex-col justify-between h-full py-4 px-3 bg-background border-border select-none",
        className,
      )}
    >
      {/* Üst Kısım: Marka ve Navigasyon Menüsü */}
      <div className="space-y-6">
        {/* Marka / Logo */}
        <div className="px-2">
          <Link
            href="/"
            onClick={onNavigate}
            className="group inline-flex items-center gap-2.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-xl p-1"
          >
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
              <span className="font-serif">✦</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-foreground font-serif">
                Actos
              </span>
              <Badge
                variant="outline"
                size="sm"
                className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground border-border/80"
              >
                v0.1
              </Badge>
            </div>
          </Link>
        </div>

        {/* Menü Linkleri */}
        <nav className="space-y-1" aria-label="Ana Menü">
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
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer",
                  isActive
                    ? "bg-surface-2 text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2/60",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge != null && (
                  <span
                    role="status"
                    data-testid="inbox-badge"
                    aria-label={`${item.badge} okunmamış bildirim`}
                    className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full bg-primary text-primary-foreground shadow-xs animate-in zoom-in-50"
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Belirgin "Yeni Post" Butonu */}
        <div className="pt-2 px-1">
          <Button
            asChild
            size="lg"
            className="w-full justify-center gap-2 rounded-xl h-11 font-semibold text-sm shadow-xs hover:opacity-95 cursor-pointer"
          >
            <Link href="/new" onClick={onNavigate}>
              <PenSquare className="w-4 h-4" />
              <span>{t("nav.newPost")}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Alt Kısım: Tema Seçici ve Oturum / Profil Alanı */}
      <div className="space-y-4 pt-4 border-t border-border/70 px-1">
        {/* Tema ve Dil Seçici Bileşenleri */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Görünüm
            </span>
            <LocaleSwitcher showIcon={false} />
          </div>
          <ThemeSwitcher showLabels={false} className="w-full justify-between" />
        </div>

        {/* Profil / Oturum Durumu */}
        {currentUser ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface-2/70 border border-border">
            <Link
              href={currentUser.username ? `/u/${currentUser.username}` : "/me"}
              onClick={onNavigate}
              className="flex items-center gap-2.5 min-w-0 flex-1 group focus-visible:outline-hidden"
            >
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {currentUser.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <AvatarActorBadge actorType={currentUser.actorType} size="sm" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground truncate group-hover:underline">
                    {currentUser.displayName || currentUser.username}
                  </span>
                  {currentUser.role !== "user" && (
                    <Badge
                      variant="outline"
                      size="sm"
                      className="text-[9px] px-1 py-0 border-border text-primary"
                    >
                      {currentUser.role === "admin" ? "Admin" : "Mod"}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground truncate block">
                  @{currentUser.username}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title={t("nav.logout")}
              aria-label={t("nav.logout")}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2 p-2.5 rounded-xl bg-surface-2/40 border border-border">
            <div className="text-xs text-muted-foreground text-center">
              Fikrini paylaş, tartışmaya katıl
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm" className="w-full text-xs">
                <Link href="/login" onClick={onNavigate}>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t("nav.login")}</span>
                </Link>
              </Button>
              <Button asChild size="sm" className="w-full text-xs">
                <Link href="/register" onClick={onNavigate}>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t("nav.register")}</span>
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
