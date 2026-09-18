"use client";

import { useQuery } from "@tanstack/react-query";
import type { ActorProfile, ActorType } from "actos";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { FollowButton } from "@/components/actor/follow-button";
import { ActorAvatar } from "@/components/ui/avatar";
import { ActorBadge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { readApiJson } from "@/lib/query/http";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

interface ActorHoverCardProps {
  username: string;
  children: ReactNode;
  className?: string;
}

const OPEN_DELAY_MS = 180;
const CLOSE_DELAY_MS = 120;

async function fetchActorProfile(username: string): Promise<ActorProfile> {
  const response = await fetch(`/api/actors/${encodeURIComponent(username)}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await readApiJson<{ profile: ActorProfile }>(response);
  return data.profile;
}

/** Desktop-only actor preview. React Query keeps one cached profile per username. */
export function ActorHoverCard({ username, children, className }: ActorHoverCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileQuery = useQuery({
    queryKey: queryKeys.actors.profile(username),
    queryFn: () => fetchActorProfile(username),
    enabled: open,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  const openImmediately = () => {
    clearTimers();
    setOpen(true);
  };

  const profile = profileQuery.data;
  const actor = profile?.actor;
  const stats = profile?.stats;
  const actorType = (actor?.actorType || "human") as ActorType;
  const displayName = actor?.displayName || actor?.username || username;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover/focus are progressive desktop enhancement; child links retain native interaction.
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocusCapture={openImmediately}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleClose();
      }}
    >
      {children}
      {open ? (
        <span
          role="dialog"
          aria-label={t("profile.preview_label", { username })}
          data-testid="actor-hover-card"
          className="absolute left-0 top-full z-50 mt-2 hidden w-80 rounded-[10px] border border-border bg-bg p-4 text-left text-sm text-fg shadow-lg md:block"
          onMouseEnter={openImmediately}
          onMouseLeave={scheduleClose}
        >
          {profileQuery.isPending ? (
            <span role="status" className="block space-y-3" aria-label={t("common.loading")}>
              <span className="block h-10 w-10 animate-pulse rounded-full bg-bg-muted" />
              <span className="block h-3 w-2/3 animate-pulse rounded bg-bg-muted" />
              <span className="block h-3 w-full animate-pulse rounded bg-bg-muted" />
            </span>
          ) : profileQuery.isError || !actor || !stats ? (
            <span className="text-sm text-fg-muted">{t("profile.preview_unavailable")}</span>
          ) : (
            <span className="block space-y-3">
              <span className="flex items-start justify-between gap-3">
                <Link href={`/u/${actor.username}`} className="flex min-w-0 items-center gap-3">
                  <ActorAvatar
                    actorType={actorType}
                    username={actor.username}
                    displayName={displayName}
                    src={actor.avatarUrl}
                    size={40}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-fg">{displayName}</span>
                      <ActorBadge actorType={actorType} />
                    </span>
                    <span className="block truncate font-mono text-xs text-fg-muted">
                      @{actor.username}
                    </span>
                  </span>
                </Link>
                <FollowButton username={actor.username} size="sm" />
              </span>
              {actor.bio ? (
                <span className="line-clamp-3 block leading-relaxed text-fg">{actor.bio}</span>
              ) : null}
              <span className="flex gap-4 text-xs text-fg-muted">
                <span>
                  <strong className="font-mono text-fg">{stats.postCount}</strong>{" "}
                  {t("profile.stats.posts")}
                </span>
                <span>
                  <strong className="font-mono text-fg">{stats.commentCount}</strong>{" "}
                  {t("profile.stats.comments")}
                </span>
                <span>
                  <strong className="font-mono text-fg">{stats.totalScore}</strong>{" "}
                  {t("profile.stats.score")}
                </span>
              </span>
            </span>
          )}
        </span>
      ) : null}
    </span>
  );
}
