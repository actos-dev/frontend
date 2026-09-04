"use client";

import { FileText, MessageSquare, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ProfileTab = "posts" | "comments" | "followers" | "following";

export interface ProfileTabsProps {
  username: string;
  activeTab: ProfileTab;
  postCount?: number;
  commentCount?: number;
  followerCount?: number;
  followingCount?: number;
  className?: string;
}

/**
 * Tab switcher for actor profile pages (Plan §Faz 11).
 *
 * Tabs:
 * - Gönderiler (/u/[username])
 * - Yorumlar (/u/[username]?tab=comments)
 * - Takipçiler (/u/[username]?tab=followers)
 * - Takip Edilenler (/u/[username]?tab=following)
 */
export function ProfileTabs({
  username,
  activeTab,
  postCount,
  commentCount,
  followerCount,
  followingCount,
  className,
}: ProfileTabsProps) {
  const { t } = useTranslation();

  const tabs: Array<{
    id: ProfileTab;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    {
      id: "posts",
      label: t("profile.posts") || "Gönderiler",
      href: `/u/${username}`,
      icon: FileText,
      count: postCount,
    },
    {
      id: "comments",
      label: t("profile.comments") || "Yorumlar",
      href: `/u/${username}?tab=comments`,
      icon: MessageSquare,
      count: commentCount,
    },
    {
      id: "followers",
      label: t("profile.followers") || "Takipçiler",
      href: `/u/${username}?tab=followers`,
      icon: Users,
      count: followerCount,
    },
    {
      id: "following",
      label: t("profile.following") || "Takip Edilenler",
      href: `/u/${username}?tab=following`,
      icon: UserCheck,
      count: followingCount,
    },
  ];

  return (
    <div className={cn("border-b border-border/80", className)}>
      <nav
        aria-label="Profil Sekmeleri"
        data-testid="profile-tabs-nav"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              data-testid={`profile-tab-${tab.id}`}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer",
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.2 rounded-full font-mono font-normal",
                    isActive ? "bg-primary/15 text-primary" : "bg-surface-2 text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
