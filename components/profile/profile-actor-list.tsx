"use client";

import type { Actor } from "actos";
import { useState } from "react";
import { LoadMore } from "@/components/pagination/load-more";
import { ProfileActorCard } from "@/components/profile/profile-actor-card";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";

export interface ProfileActorListProps {
  username: string;
  relation: "followers" | "following";
  initialActors: Actor[];
  initialNextCursor: string | null;
}

export function ProfileActorList({
  username,
  relation,
  initialActors,
  initialNextCursor,
}: ProfileActorListProps) {
  const { t } = useTranslation();
  const [actors, setActors] = useState(initialActors);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async (cursor: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ cursor, limit: "50" });
      const response = await fetch(
        `/api/actors/${encodeURIComponent(username)}/${relation}?${params.toString()}`,
      );
      const result = await response.json();
      if (!response.ok || result?.ok !== true || !Array.isArray(result.items)) {
        toast.error(result?.detail || result?.title || t("profile.list_load_error"));
        return;
      }

      setActors((current) => {
        const ids = new Set(current.map((actor) => actor.id));
        return [...current, ...result.items.filter((actor: Actor) => !ids.has(actor.id))];
      });
      setNextCursor(typeof result.nextCursor === "string" ? result.nextCursor : null);
    } catch {
      toast.error(t("profile.list_load_error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="divide-y divide-border" data-testid={`profile-${relation}-list`}>
        {actors.map((actor) => (
          <ProfileActorCard key={actor.id} actor={actor} />
        ))}
      </div>
      <LoadMore
        nextCursor={nextCursor}
        onLoadMore={loadMore}
        isLoading={isLoading}
        syncUrl={false}
        label={t("profile.load_more")}
        loadingLabel={t("profile.loading")}
      />
    </>
  );
}
