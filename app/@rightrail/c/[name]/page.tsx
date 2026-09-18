import type { Community } from "actos";
import { RightRail } from "@/components/layout/right-rail";
import { SiteFooter } from "@/components/layout/site-footer";
import { getServerClient } from "@/lib/actos";
import { getCommunity } from "@/lib/communities/fetchers";
import { formatCommunityDate } from "@/lib/communities/format";
import { isCommunityCover } from "@/lib/communities/params";
import { FEATURE_COMMUNITIES } from "@/lib/features";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { renderContent } from "@/lib/render/index";

export const dynamic = "force-dynamic";

const HEADING_CLASS =
  "text-[11px] font-mono font-medium uppercase tracking-wider text-fg-subtle mb-2.5";

interface CommunityRightRailProps {
  params: Promise<{ name: string }>;
}

/**
 * The community rail (ROADMAP §7.1): the rendered description and the created
 * date. A private cover keeps its description but drops the created date,
 * which is not part of the cover contract.
 */
export default async function CommunityRightRail({ params }: CommunityRightRailProps) {
  const { name } = await params;
  const communityName = decodeURIComponent(name);
  const locale = await getServerLocale();
  const { t } = getTranslations(locale);

  if (!FEATURE_COMMUNITIES) {
    return (
      <RightRail>
        <SiteFooter t={t} />
      </RightRail>
    );
  }

  let community: Community | null = null;
  try {
    const client = await getServerClient();
    community = await getCommunity(client, communityName);
  } catch {
    // A missing or unreachable community leaves only the footer here.
    community = null;
  }

  if (!community) {
    return (
      <RightRail>
        <SiteFooter t={t} />
      </RightRail>
    );
  }

  const isCover = isCommunityCover(community);
  const descriptionHtml = isCover ? "" : await renderContent(community.description);

  return (
    <RightRail>
      <section aria-labelledby="rail-about-community">
        <h2 id="rail-about-community" className={HEADING_CLASS}>
          {t("rightRail.aboutCommunity", { name: communityName })}
        </h2>
        {isCover ? (
          community.description ? (
            <p className="text-sm text-fg-muted">{community.description}</p>
          ) : (
            <p className="text-sm text-fg-muted">{t("communities.no_description")}</p>
          )
        ) : descriptionHtml ? (
          <div
            className="prose prose-sm"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered and sanitized by lib/render (Markstone)
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p className="text-sm text-fg-muted">{t("communities.no_description")}</p>
        )}

        {!isCover && (
          <p className="mt-3 text-xs text-fg-subtle">
            {t("communities.created", {
              date: formatCommunityDate(community.createdAt, locale),
            })}
          </p>
        )}
      </section>

      <SiteFooter t={t} />
    </RightRail>
  );
}
