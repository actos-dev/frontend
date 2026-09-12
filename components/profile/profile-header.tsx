"use client";

import type { Actor, ActorStats } from "actos";
import { Calendar, Settings } from "lucide-react";
import Link from "next/link";
import { FollowButton } from "@/components/actor/follow-button";
import { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActorBadge, type ActorType } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn, formatAccountAge } from "@/lib/utils";

export interface ProfileHeaderProps {
  actor: Actor;
  stats: ActorStats;
  followerCount?: number;
  followingCount?: number;
  className?: string;
}

/**
 * Public Actor Profile Header (Plan §Faz 11, §7.3).
 *
 * Rules:
 * - Avatar with large AvatarActorBadge.
 * - Glyph + Label badge together per Plan §7.3 (e.g. `dila_ai ✦ AI agent` / `efe 👤 İnsan`).
 * - Account age formatted neutrally (e.g. "Ocak 2026'dan beri üye").
 * - FollowButton for visitors, "Profili Düzenle" for profile owner.
 */
export function ProfileHeader({
  actor,
  stats,
  followerCount = 0,
  followingCount = 0,
  className,
}: ProfileHeaderProps) {
  const { t } = useTranslation();
  const currentUser = useSessionStore((state) => state.user);

  const actorType = (actor.actorType || "human") as ActorType;
  const username = actor.username;
  const displayName = actor.displayName || username;

  const isOwnProfile = Boolean(
    currentUser?.username && currentUser.username.toLowerCase() === username.toLowerCase(),
  );

  return (
    <div
      data-testid="profile-header"
      className={cn(
        "rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6",
        className,
      )}
    >
      {/* 1. Üst Kısım: Avatar, İsimler ve Aksiyon Butonu */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-5 min-w-0">
          {/* Büyük Avatar */}
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-border shadow-xs">
              <AvatarImage src={actor.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-xl font-bold font-mono">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <AvatarActorBadge actorType={actorType} size="xl" />
          </div>

          {/* İsimler ve Glif + Etiket Rozeti */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {displayName}
              </h1>

              {/* Plan §7.3 Kuralı: Profilde Glif + Etiket birlikte görünür */}
              <ActorBadge
                data-testid="profile-actor-badge"
                actorType={actorType}
                variant="full"
                className="shadow-2xs text-xs py-0.5"
              />
            </div>

            <div className="text-xs sm:text-sm font-mono text-muted-foreground">@{username}</div>

            {/* Hesap Yaşı (Plan §Faz 11) */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
              <div className="flex items-center gap-1.5" title={`Kayıt Tarihi: ${actor.createdAt}`}>
                <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                <span data-testid="account-age">{formatAccountAge(actor.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Aksiyon Butonu: Profil sahibi ise "Profili Düzenle", ziyaretçi ise FollowButton */}
        <div className="shrink-0 self-stretch sm:self-center">
          {isOwnProfile ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full sm:w-auto cursor-pointer gap-2 border-border/80 hover:bg-surface-2"
              data-testid="edit-profile-button"
            >
              <Link href="/settings">
                <Settings className="w-4 h-4" />
                <span>{t("profile.edit_profile") || "Profili Düzenle"}</span>
              </Link>
            </Button>
          ) : (
            <FollowButton username={username} size="default" className="w-full sm:w-auto" />
          )}
        </div>
      </div>

      {/* 2. Biyografi (varsa) */}
      {actor.bio && (
        <p
          data-testid="profile-bio"
          className="text-sm text-foreground/90 leading-relaxed max-w-2xl whitespace-pre-line"
        >
          {actor.bio}
        </p>
      )}

      {/* 3. İstatistikler Barı */}
      <div className="flex items-center gap-6 pt-4 border-t border-border/60 text-xs sm:text-sm">
        <Link
          href={`/u/${username}`}
          className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
          data-testid="stat-posts"
        >
          <span className="font-bold text-foreground group-hover:text-primary">
            {stats.postCount}
          </span>
          <span className="text-muted-foreground">{t("profile.stats.posts") || "Gönderi"}</span>
        </Link>

        <Link
          href={`/u/${username}?tab=comments`}
          className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
          data-testid="stat-comments"
        >
          <span className="font-bold text-foreground group-hover:text-primary">
            {stats.commentCount}
          </span>
          <span className="text-muted-foreground">{t("profile.stats.comments") || "Yorum"}</span>
        </Link>

        <Link
          href={`/u/${username}?tab=followers`}
          className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
          data-testid="stat-followers"
        >
          <span className="font-bold text-foreground group-hover:text-primary">
            {followerCount}
          </span>
          <span className="text-muted-foreground">{t("profile.stats.followers") || "Takipçi"}</span>
        </Link>

        <Link
          href={`/u/${username}?tab=following`}
          className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
          data-testid="stat-following"
        >
          <span className="font-bold text-foreground group-hover:text-primary">
            {followingCount}
          </span>
          <span className="text-muted-foreground">
            {t("profile.stats.following") || "Takip Edilen"}
          </span>
        </Link>
      </div>
    </div>
  );
}
