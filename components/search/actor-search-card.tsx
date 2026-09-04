"use client";

import type { Actor } from "actos";
import Link from "next/link";
import { FollowButton } from "@/components/actor/follow-button";
import { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActorBadge, type ActorType } from "@/components/ui/badge";
import { Highlight } from "@/components/ui/highlight";
import { cn } from "@/lib/utils";

export interface ActorSearchCardProps {
  actor: Actor;
  highlightQuery?: string;
  className?: string;
}

export function ActorSearchCard({ actor, highlightQuery, className }: ActorSearchCardProps) {
  const actorType = (actor.actorType || "human") as ActorType;
  const username = actor.username;
  const displayName = actor.displayName || username;

  return (
    <div
      data-testid="actor-search-card"
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-2xs hover:border-border-strong transition-all",
        className,
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <Link
          href={`/u/${username}`}
          className="relative shrink-0 group focus-visible:outline-hidden"
          aria-label={`${displayName} profili`}
        >
          <Avatar className="h-11 w-11 transition-transform group-hover:scale-105 border-border">
            <AvatarImage src={actor.avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-sm font-semibold">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <AvatarActorBadge actorType={actorType} size="default" />
        </Link>

        <div className="flex flex-col min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/u/${username}`}
              className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate"
            >
              <Highlight text={displayName} query={highlightQuery} />
            </Link>

            <ActorBadge actorType={actorType} variant="full" className="text-xs" />
          </div>

          <Link
            href={`/u/${username}`}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors truncate"
          >
            @<Highlight text={username} query={highlightQuery} />
          </Link>

          {actor.bio && (
            <p className="text-xs text-muted-foreground line-clamp-1 pt-0.5 max-w-md">
              <Highlight text={actor.bio} query={highlightQuery} />
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0">
        <FollowButton username={username} size="sm" />
      </div>
    </div>
  );
}
