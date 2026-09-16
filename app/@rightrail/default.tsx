import { RightRail } from "@/components/layout/right-rail";
import { SiteFooter } from "@/components/layout/site-footer";
import { getServerLocale, getTranslations } from "@/lib/i18n";

/**
 * The `@rightrail` parallel-route slot's catch-all (ROADMAP.md S-03):
 * matched whenever no more specific slot page below exists for the current
 * URL. Profile, search, saved, inbox, settings, moderation, auth pages and
 * everything else get nothing but the footer here.
 */
export default async function DefaultRightRail() {
  const locale = await getServerLocale();
  const { t } = getTranslations(locale);

  return (
    <RightRail>
      <SiteFooter t={t} />
    </RightRail>
  );
}
