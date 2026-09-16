import { RightRail, TagCountModule } from "@/components/layout/right-rail";
import { SiteFooter } from "@/components/layout/site-footer";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { getTagPostCount } from "@/lib/tags";

export const dynamic = "force-dynamic";

interface TagRightRailProps {
  params: Promise<{ name: string }>;
}

/** Tag right rail (ROADMAP.md S-03): the tag's post count. */
export default async function TagRightRail({ params }: TagRightRailProps) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name).toLowerCase();
  const locale = await getServerLocale();
  const { t } = getTranslations(locale);

  const count = await getTagPostCount(decodedName);

  return (
    <RightRail>
      {count !== null && <TagCountModule tagName={decodedName} count={count} t={t} />}
      <SiteFooter t={t} />
    </RightRail>
  );
}
