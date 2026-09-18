import type { Community } from "actos";
import { Button } from "@/components/ui/button";

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
 * The "Apply to join" control is deliberately a disabled placeholder: the
 * application write is the next task, and a button that silently did nothing
 * would be worse than one that says so.
 */
export function CommunityCover({ community, t }: CommunityCoverProps) {
  return (
    <section data-testid="community-cover" className="px-4 py-14 sm:px-6">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {t("communities.private")}
        </span>
        <h1 className="font-serif text-3xl font-semibold text-fg">c/{community.name}</h1>
        {community.description ? (
          <p className="text-sm text-fg-muted">{community.description}</p>
        ) : null}
        <p className="text-sm text-fg">{t("communities.cover_description")}</p>
        <Button type="button" disabled title={t("communities.cover_apply_note")}>
          {t("communities.cover_apply")}
        </Button>
        <p className="text-xs text-fg-subtle">{t("communities.cover_apply_note")}</p>
      </div>
    </section>
  );
}
