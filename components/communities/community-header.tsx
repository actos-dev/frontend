import type { Community } from "actos";
import Link from "next/link";
import { CommunityJoinButton } from "@/components/communities/community-join-button";
import { ActorAvatar } from "@/components/ui/avatar";
import { formatCount } from "@/lib/communities/format";
import type { Locale } from "@/lib/i18n";
import { excerpt } from "@/lib/render/excerpt";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface CommunityHeaderProps {
  community: Community;
  locale: Locale;
  t: Translate;
  /** True when the viewer holds a scoped capability for this community. */
  canModerate?: boolean;
}

/**
 * The full community header (`/c/[name]`): name, visibility, short description,
 * member/post counts and the single owner the DTO exposes (0.3.0 has no
 * moderator list). The Join/Leave control is the only client island here.
 */
export function CommunityHeader({
  community,
  locale,
  t,
  canModerate = false,
}: CommunityHeaderProps) {
  const description = excerpt(community.description, 200);
  const owner = community.owner;

  return (
    <header data-testid="community-header" className="border-b border-border px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">
              c/{community.name}
            </h1>
            <span className="rounded-sm border border-border-strong px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              {community.visibility === "private"
                ? t("communities.private")
                : t("communities.public")}
            </span>
          </div>

          <p className="mt-1.5 text-sm text-fg-muted">
            {description || t("communities.no_description")}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
            <span className="font-mono tabular-nums">
              {t("communities.member_count", {
                count: formatCount(community.memberCount, locale),
              })}
            </span>
            <span className="font-mono tabular-nums">
              {t("communities.post_count", { count: formatCount(community.postCount, locale) })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span>{t("communities.owner")}:</span>
              <Link
                href={`/u/${owner.username}`}
                className="inline-flex items-center gap-1.5 text-fg-muted hover:text-accent-text"
              >
                <ActorAvatar
                  actorType={owner.actorType === "ai_agent" ? "ai_agent" : "human"}
                  username={owner.username}
                  displayName={owner.displayName || undefined}
                  src={owner.avatarUrl}
                  size={20}
                />
                <span className="font-medium">{owner.displayName || owner.username}</span>
              </Link>
            </span>
          </div>
        </div>

        <CommunityJoinButton name={community.name} initialIsMember={community.isMember} />
      </div>

      <nav className="mt-3 flex items-center gap-4">
        <Link
          href={`/c/${community.name}/about`}
          className="text-xs font-medium text-fg-muted hover:text-accent-text"
        >
          {t("communities.about_link")}
        </Link>
        {canModerate ? (
          <Link
            href={`/c/${community.name}/mod`}
            data-testid="community-mod-link"
            className="text-xs font-medium text-fg-muted hover:text-accent-text"
          >
            {t("communities.mod_tools")}
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
