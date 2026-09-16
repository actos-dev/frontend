"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Keyboard, LogOut, Settings, Shield, User } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ActorAvatar } from "@/components/ui/avatar";
import { PopoverContent } from "@/components/ui/popover";
import { useTranslation } from "@/lib/i18n";
import type { SessionUser } from "@/lib/stores/session-store";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";

export interface AccountMenuProps {
  user: SessionUser;
  isModerator: boolean;
  onOpenShortcuts: () => void;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-fg hover:bg-bg-subtle transition-colors cursor-pointer text-left";

/**
 * The account menu (ROADMAP.md S-01): profile, settings, moderation (when
 * applicable), keyboard shortcuts, the theme and language switchers, and
 * log out. Used both as the desktop sidebar's account-block popover and the
 * mobile top bar's avatar popover — one menu, two triggers.
 */
export function AccountMenu({
  user,
  isModerator,
  onOpenShortcuts,
  align = "start",
  side = "top",
  children,
}: AccountMenuProps) {
  const { t } = useTranslation();
  const logout = useSessionStore((state) => state.logout);

  const profileHref = user.username ? `/u/${user.username}` : "/me";

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>
      <PopoverContent align={align} side={side} sideOffset={8} className="w-64 p-1.5 rounded-xl">
        <div className="flex items-center gap-2.5 px-2 py-2 border-b border-border mb-1">
          <ActorAvatar
            actorType={user.actorType}
            username={user.username}
            displayName={user.displayName || undefined}
            src={user.avatarUrl}
            size={28}
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-fg truncate">
              {user.displayName || user.username}
            </div>
            <div className="text-xs font-mono text-fg-subtle truncate">@{user.username}</div>
          </div>
        </div>

        <nav aria-label={t("accountMenu.label")} className="flex flex-col py-1">
          <PopoverPrimitive.Close asChild>
            <Link href={profileHref} className={ITEM_CLASS}>
              <User className="w-4 h-4 text-fg-muted" aria-hidden="true" />
              <span>{t("nav.profile")}</span>
            </Link>
          </PopoverPrimitive.Close>
          <PopoverPrimitive.Close asChild>
            <Link href="/settings" className={ITEM_CLASS}>
              <Settings className="w-4 h-4 text-fg-muted" aria-hidden="true" />
              <span>{t("nav.settings")}</span>
            </Link>
          </PopoverPrimitive.Close>
          {isModerator && (
            <PopoverPrimitive.Close asChild>
              <Link href="/mod" className={ITEM_CLASS}>
                <Shield className="w-4 h-4 text-fg-muted" aria-hidden="true" />
                <span>{t("nav.moderation")}</span>
              </Link>
            </PopoverPrimitive.Close>
          )}
          <PopoverPrimitive.Close asChild>
            <button type="button" onClick={onOpenShortcuts} className={ITEM_CLASS}>
              <Keyboard className="w-4 h-4 text-fg-muted" aria-hidden="true" />
              <span>{t("shortcuts.title")}</span>
            </button>
          </PopoverPrimitive.Close>
        </nav>

        <div className="border-t border-border pt-2.5 mt-1 px-2 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-fg-subtle uppercase tracking-wider">
              {t("appearance.label")}
            </span>
            <ThemeSwitcher showLabels={false} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-fg-subtle uppercase tracking-wider">
              {t("accountMenu.language")}
            </span>
            <LocaleSwitcher showIcon={false} />
          </div>
        </div>

        <div className="border-t border-border mt-2.5 pt-1.5">
          <PopoverPrimitive.Close asChild>
            <button
              type="button"
              onClick={() => {
                logout();
              }}
              className={cn(ITEM_CLASS, "text-danger hover:bg-danger/10")}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>{t("nav.logout")}</span>
            </button>
          </PopoverPrimitive.Close>
        </div>
      </PopoverContent>
    </PopoverPrimitive.Root>
  );
}
