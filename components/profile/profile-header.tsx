"use client";

import type { Actor, ActorStats } from "actos";
import Link from "next/link";
import { FollowButton } from "@/components/actor/follow-button";
import { ActorAvatar } from "@/components/ui/avatar";
import { ActorBadge, type ActorType } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";
import { cn, formatAccountAge } from "@/lib/utils";

export interface ProfileHeaderProps {
  actor: Actor;
  stats: ActorStats;
  /** The exact count, or "50+" when the backend page had more than we asked for. */
  followerCount?: number | string;
  followingCount?: number | string;
  initialViewerId?: string | null;
  className?: string;
}

export function ProfileHeader({
  actor,
  stats,
  followerCount = 0,
  followingCount = 0,
  initialViewerId,
  className,
}: ProfileHeaderProps) {
  const { locale, t } = useTranslation();
  const currentUser = useSessionStore((state) => state.user);
  const actorType = (actor.actorType || "human") as ActorType;
  const username = actor.username;
  const displayName = actor.displayName || username;
  const isOwnProfile = Boolean(
    currentUser?.username && currentUser.username.toLowerCase() === username.toLowerCase(),
  );

  return (
    <header
      data-testid="profile-header"
      className={cn("space-y-5 border-b border-border pb-6", className)}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <ActorAvatar
            actorType={actorType}
            username={username}
            displayName={displayName}
            src={actor.avatarUrl}
            size={88}
            className="shrink-0 border-0"
          />

          <div className="min-w-0 space-y-1.5 pt-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="truncate font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {displayName}
              </h1>
              {actorType === "ai_agent" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={t("profile.agent_accessible_label")}
                        className="inline-flex cursor-help rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <ActorBadge data-testid="profile-actor-badge" actorType={actorType} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t("profile.self_declared")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <p className="font-mono text-sm text-muted-foreground">@{username}</p>

            {actor.bio && (
              <p
                data-testid="profile-bio"
                className="max-w-2xl whitespace-pre-line pt-2 text-sm leading-relaxed text-foreground/90"
              >
                {actor.bio}
              </p>
            )}

            <p data-testid="account-age" className="pt-1 text-xs text-muted-foreground">
              {formatAccountAge(actor.createdAt, locale)}
            </p>
          </div>
        </div>

        <div className="shrink-0 sm:pt-1">
          {isOwnProfile ? (
            <Button asChild variant="outline" size="sm" data-testid="edit-profile-button">
              <Link href="/settings">{t("profile.edit_profile")}</Link>
            </Button>
          ) : (
            <FollowButton
              username={username}
              size="default"
              initialViewerId={initialViewerId}
              className="w-full sm:w-auto"
            />
          )}
        </div>
      </div>

      <nav aria-label={t("profile.stats_label")} className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <StatLink
          href={`/u/${username}`}
          testId="stat-posts"
          value={stats.postCount}
          label={t("profile.stats.posts")}
        />
        <StatLink
          href={`/u/${username}?tab=comments`}
          testId="stat-comments"
          value={stats.commentCount}
          label={t("profile.stats.comments")}
        />
        <StatLink
          href={`/u/${username}?tab=followers`}
          testId="stat-followers"
          value={followerCount}
          label={t("profile.stats.followers")}
        />
        <StatLink
          href={`/u/${username}?tab=following`}
          testId="stat-following"
          value={followingCount}
          label={t("profile.stats.following")}
        />
        <span
          data-testid="stat-score"
          className="inline-flex items-center gap-1.5 text-muted-foreground"
        >
          <span className="font-mono font-medium tabular-nums text-foreground">
            {stats.totalScore}
          </span>
          <span>{t("profile.stats.score")}</span>
        </span>
      </nav>
    </header>
  );
}

function StatLink({
  href,
  testId,
  value,
  label,
}: {
  href: string;
  testId: string;
  value: number | string;
  label: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
      <span>{label}</span>
    </Link>
  );
}
