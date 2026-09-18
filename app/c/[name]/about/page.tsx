import type { Community, CommunityMember } from "actos";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityCover } from "@/components/communities/community-cover";
import { CommunityMembers } from "@/components/communities/community-members";
import { ActorAvatar } from "@/components/ui/avatar";
import { ErrorStateRetry } from "@/components/ui/error-state-retry";
import { getServerClient } from "@/lib/actos";
import { getCommunity, listCommunityMembers } from "@/lib/communities/fetchers";
import { formatCommunityDate } from "@/lib/communities/format";
import { isCommunityCover } from "@/lib/communities/params";
import { describeError } from "@/lib/errors";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { renderContent } from "@/lib/render/index";
import { getSiteUrl } from "@/lib/seo";

interface CommunityAboutPageProps {
  params: Promise<{ name: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CommunityAboutPageProps): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  const { name } = await params;
  const communityName = decodeURIComponent(name);
  const siteUrl = getSiteUrl();
  return {
    title: `${t("communities.about_title", { name: communityName })} — Actos`,
    description: t("communities.about_description", { name: communityName }),
    alternates: { canonical: `${siteUrl}/c/${encodeURIComponent(communityName)}/about` },
  };
}

/**
 * `/c/[name]/about`: the full rendered description plus the single owner the
 * 0.3.0 DTO exposes (there is no moderator list) and the real member list. A
 * private community the viewer cannot see inside stays a cover here too.
 */
export default async function CommunityAboutPage({ params }: CommunityAboutPageProps) {
  if (!FEATURE_COMMUNITIES) notFound();

  const locale = await getServerLocale();
  const { t } = getTranslations(locale);
  const { name } = await params;
  const communityName = decodeURIComponent(name);

  const client = await getServerClient();

  let community: Community | null = null;
  let loadError: unknown = null;
  try {
    community = await getCommunity(client, communityName);
  } catch (error) {
    const { status, code } = describeError(error);
    if (status === 404 || code === "NOT_FOUND") {
      notFound();
    }
    loadError = error;
  }

  if (loadError) {
    return (
      <div className="p-6 sm:p-10">
        <ErrorStateRetry {...describeError(loadError)} />
      </div>
    );
  }

  if (!community) {
    notFound();
  }

  if (isCommunityCover(community)) {
    return <CommunityCover community={community} t={t} />;
  }

  const descriptionHtml = await renderContent(community.description);

  let members: CommunityMember[] = [];
  try {
    const page = await listCommunityMembers(client, communityName, { limit: 25 });
    members = page.members;
  } catch {
    // The member list is a secondary section; a failure renders the empty
    // message rather than taking the page down (ROADMAP X-20).
    members = [];
  }

  const owner = community.owner;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6">
      <header className="space-y-1.5">
        <Link
          href={`/c/${encodeURIComponent(communityName)}`}
          className="text-xs font-medium text-fg-muted hover:text-accent-text"
        >
          {`← c/${communityName}`}
        </Link>
        <h1 className="font-serif text-2xl font-semibold text-fg sm:text-3xl">
          {t("communities.about_title", { name: communityName })}
        </h1>
        <p className="text-xs text-fg-subtle">
          {t("communities.created", {
            date: formatCommunityDate(community.createdAt, locale),
          })}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {t("communities.description_label")}
        </h2>
        {descriptionHtml ? (
          <div
            data-testid="community-description"
            className="prose"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered and sanitized by lib/render (Markstone), not raw API HTML
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p className="text-sm text-fg-muted">{t("communities.no_description")}</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {t("communities.owner")}
        </h2>
        <div className="flex items-center gap-2.5">
          <ActorAvatar
            actorType={owner.actorType === "ai_agent" ? "ai_agent" : "human"}
            username={owner.username}
            displayName={owner.displayName || undefined}
            src={owner.avatarUrl}
            size={40}
          />
          <div className="min-w-0">
            <Link
              href={`/u/${owner.username}`}
              className="block truncate text-sm font-semibold text-fg hover:text-accent-text"
            >
              {owner.displayName || owner.username}
            </Link>
            <span className="block truncate font-mono text-xs text-fg-subtle">
              @{owner.username}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {t("communities.members_title")}
        </h2>
        <CommunityMembers members={members} locale={locale} t={t} />
      </section>
    </div>
  );
}
