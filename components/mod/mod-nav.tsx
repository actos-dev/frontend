"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Ban as BanIcon,
  BarChart3,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

interface ModNavProps {
  initialUser?: {
    username: string;
    displayName?: string | null;
    role?: string;
    roles?: string[];
  };
}

export function ModNav({ initialUser }: ModNavProps) {
  const pathname = usePathname();
  const sessionUser = useSessionStore((state) => state.user);

  const currentUser = sessionUser || initialUser;
  const roles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const isAdmin = roles.includes("admin") || currentUser?.role === "admin";
  const _isMod = roles.includes("moderator") || currentUser?.role === "moderator";

  const navItems = [
    {
      label: "Özet",
      href: "/mod",
      icon: BarChart3,
    },
    {
      label: "Rapor Kuyruğu",
      href: "/mod/reports",
      icon: AlertTriangle,
    },
    {
      label: "Ban Yönetimi",
      href: "/mod/bans",
      icon: BanIcon,
    },
    {
      label: "Denetim Kaydı",
      href: "/mod/actions",
      icon: ShieldCheck,
    },
    ...(isAdmin
      ? [
          {
            label: "Rol Yönetimi",
            href: "/mod/roles",
            icon: UserCheck,
          },
        ]
      : []),
  ];

  return (
    <header className="border-b border-border/80 bg-background/95 backdrop-blur-xs sticky top-0 z-40">
      {/* Üst Çubuk: Başlık, Durum Rozeti ve Siteye Dön */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 rounded-xl"
          >
            <Link href="/" aria-label="Siteye Dön">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Siteye Dön</span>
            </Link>
          </Button>

          <div className="h-4 w-px bg-border/80" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight font-serif">Moderasyon Paneli</span>
          </div>
        </div>

        {/* Kullanıcı Durum Rozeti */}
        {currentUser && (
          <div
            data-testid="mod-status-badge"
            className="flex items-center gap-2 bg-surface-2 px-3 py-1.5 rounded-full border border-border/60 text-xs"
          >
            <span className="text-muted-foreground font-mono">@{currentUser.username}</span>
            <Badge
              variant={isAdmin ? "default" : "secondary"}
              size="sm"
              className={cn(
                "uppercase tracking-wider font-mono text-[10px] px-1.5 py-0.5",
                isAdmin && "bg-primary text-primary-foreground",
              )}
            >
              {isAdmin ? (
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Admin
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Moderatör
                </span>
              )}
            </Badge>
          </div>
        )}
      </div>

      {/* Alt Çubuk: Sekmeler */}
      <nav
        aria-label="Moderasyon Sekmeleri"
        className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/mod" ? pathname === "/mod" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`mod-nav-${item.href.replace("/mod/", "").replace("/mod", "summary")}`}
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
