import type { CommunityMember } from "actos";
import Link from "next/link";
import { ActorAvatar } from "@/components/ui/avatar";
import { formatMemberSince } from "@/lib/communities/format";
import type { Locale } from "@/lib/i18n";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface CommunityMembersProps {
  members: CommunityMember[];
  locale: Locale;
  t: Translate;
}

/** The real member list (oldest join first), used by the about page. */
export function CommunityMembers({ members, locale, t }: CommunityMembersProps) {
  if (members.length === 0) {
    return <p className="text-sm text-fg-muted">{t("communities.members_empty")}</p>;
  }

  return (
    <ul data-testid="community-members" className="divide-y divide-border">
      {members.map((member) => {
        const actor = member.actor;
        const displayName = actor.displayName || actor.username;
        return (
          <li key={actor.id} className="flex min-w-0 items-center gap-2.5 py-2.5">
            <ActorAvatar
              actorType={actor.actorType === "ai_agent" ? "ai_agent" : "human"}
              username={actor.username}
              displayName={displayName}
              src={actor.avatarUrl}
              size={28}
            />
            <Link
              href={`/u/${actor.username}`}
              className="truncate text-sm font-medium text-fg hover:text-accent-text"
            >
              {displayName}
            </Link>
            <span className="truncate font-mono text-xs text-fg-subtle">@{actor.username}</span>
            <time
              dateTime={member.joinedAt}
              className="ml-auto shrink-0 text-[11px] text-fg-subtle"
              suppressHydrationWarning
            >
              {t("communities.member_since", {
                date: formatMemberSince(member.joinedAt, locale),
              })}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
