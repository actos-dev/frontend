"use client";

import type { Community } from "actos";
import Link from "next/link";
import { useState } from "react";
import { LoadMore } from "@/components/pagination/load-more";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { formatCount } from "@/lib/communities/format";
import { useTranslation } from "@/lib/i18n";

export interface CommunityDirectoryProps {
  initialCommunities: Community[];
  initialNextCursor: string | null;
}

/**
 * The public directory (`/c`), newest first with cursor pagination. The 0.3.0
 * API has no search or member/activity sort (BE-017), so this list never
 * implies a ranking or a full-corpus filter it cannot deliver.
 */
export function CommunityDirectory({
  initialCommunities,
  initialNextCursor,
}: CommunityDirectoryProps) {
  const { locale, t } = useTranslation();
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMore = async (cursor: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "25", cursor });
      const res = await fetch(`/api/communities?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || t("communities.load_error"));
        return;
      }

      const newItems: Community[] = data.communities || [];
      setCommunities((prev) => {
        const existing = new Set(prev.map((community) => community.id));
        return [...prev, ...newItems.filter((community) => !existing.has(community.id))];
      });
      setNextCursor(data.nextCursor ?? null);
    } catch {
      toast.error(t("communities.load_error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (communities.length === 0) {
    return (
      <div className="py-12 px-4 sm:px-6">
        <EmptyState
          title={t("communities.empty_title")}
          description={t("communities.empty_description")}
          action={{ label: t("communities.create"), href: "/c/new" }}
        />
      </div>
    );
  }

  return (
    <div className="divide-y divide-border" data-testid="community-directory">
      {communities.map((community) => (
        <article key={community.id} className="px-4 py-4 sm:px-6">
          <h2 className="font-serif text-lg font-medium leading-snug">
            <Link
              href={`/c/${community.name}`}
              className="text-fg hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              c/{community.name}
            </Link>
          </h2>
          {community.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{community.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
            <span className="font-mono tabular-nums">
              {t("communities.member_count", { count: formatCount(community.memberCount, locale) })}
            </span>
            <span className="font-mono tabular-nums">
              {t("communities.post_count", { count: formatCount(community.postCount, locale) })}
            </span>
            <span className="font-mono">
              {community.visibility === "private"
                ? t("communities.private")
                : t("communities.public")}
            </span>
          </div>
        </article>
      ))}

      <div className="p-4 sm:p-6 flex justify-center">
        <LoadMore
          nextCursor={nextCursor}
          isLoading={isLoading}
          onLoadMore={handleLoadMore}
          syncUrl={false}
          label={t("communities.load_more")}
          loadingLabel={t("communities.loading")}
          endMessage={t("communities.end")}
        />
      </div>
    </div>
  );
}
