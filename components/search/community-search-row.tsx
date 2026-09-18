"use client";

import type { Community } from "actos";
import Link from "next/link";
import { Highlight } from "@/components/ui/highlight";
import { formatCount } from "@/lib/communities/format";
import { useTranslation } from "@/lib/i18n";

export interface CommunitySearchRowProps {
  community: Community;
  highlightQuery?: string;
}

/**
 * One community in the search results. The search API has no community
 * search, so this row is only ever fed by the client-side filter over the
 * loaded directory page (ROADMAP §7.2, BE-017).
 */
export function CommunitySearchRow({ community, highlightQuery }: CommunitySearchRowProps) {
  const { locale, t } = useTranslation();
  return (
    <article data-testid="community-search-row" className="px-4 py-4">
      <h2 className="font-serif text-lg font-medium leading-snug">
        <Link
          href={`/c/${community.name}`}
          className="text-fg hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          c/
          <Highlight text={community.name} query={highlightQuery} />
        </Link>
      </h2>
      {community.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
          <Highlight text={community.description} query={highlightQuery} />
        </p>
      ) : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-xs text-fg-subtle">
        <span className="font-mono tabular-nums">
          {t("communities.member_count", { count: formatCount(community.memberCount, locale) })}
        </span>
        <span className="font-mono tabular-nums">
          {t("communities.post_count", { count: formatCount(community.postCount, locale) })}
        </span>
      </div>
    </article>
  );
}
