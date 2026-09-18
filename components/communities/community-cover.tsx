import type { Community } from "actos";
import { ApplyToJoinForm } from "@/components/communities/apply-to-join-form";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface CommunityCoverProps {
  community: Community;
  t: Translate;
}

/**
 * The cover a private community serves to a viewer who is not a member
 * (COMMUNITY_PLAN.md §2). It carries the name and short description and
 * nothing from inside: no feed, no members, no owner. The counts are the
 * zeroed cover values the API returned, so they are not shown at all.
 *
 * The application form is a client island; the cover itself stays a server
 * component so no private data crosses the boundary.
 */
export function CommunityCover({ community, t }: CommunityCoverProps) {
  return (
    <section data-testid="community-cover" className="px-4 py-14 sm:px-6">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {t("communities.private")}
        </span>
        <h1 className="font-serif text-3xl font-semibold text-fg">c/{community.name}</h1>
        {community.description ? (
          <p className="text-sm text-fg-muted">{community.description}</p>
        ) : null}
        <p className="text-sm text-fg">{t("communities.cover_description")}</p>
        <ApplyToJoinForm name={community.name} />
      </div>
    </section>
  );
}
