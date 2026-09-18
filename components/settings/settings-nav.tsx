"use client";

import { Settings2, SlidersHorizontal, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SettingsNavProps {
  className?: string;
}

/**
 * Secondary navigation for settings pages (Plan §Faz 11).
 *
 * NOTE: Verified domains (/settings/verifications) is deliberately omitted
 * per Plan §2 / NOTES §9.2 cancellation.
 */
export function SettingsNav({ className }: SettingsNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    {
      href: "/settings",
      label: t("settings.tabs.profile"),
      icon: User,
      exact: true,
    },
    {
      href: "/settings/account",
      label: t("settings.tabs.account"),
      icon: Settings2,
      exact: false,
    },
    {
      href: "/settings/preferences",
      label: t("settings.tabs.preferences"),
      icon: SlidersHorizontal,
      exact: false,
    },
  ];

  return (
    <nav
      aria-label={t("settings.nav_label")}
      className={cn(
        "flex items-center gap-1 border-b border-border/80 pb-px overflow-x-auto no-scrollbar",
        className,
      )}
    >
      {navItems.map((item) => {
        const isAccountRoute =
          item.href === "/settings/account" &&
          (pathname?.startsWith("/settings/account") ||
            pathname?.startsWith("/settings/keys") ||
            pathname?.startsWith("/settings/recovery"));
        const isActive = item.exact
          ? pathname === item.href
          : isAccountRoute || pathname?.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer",
              isActive
                ? "border-primary text-primary font-semibold bg-primary/5 rounded-t-lg"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
