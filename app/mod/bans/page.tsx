import type { Metadata } from "next";
import { BansManager } from "@/components/mod/bans-manager";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { requireModServer } from "@/lib/mod/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  return {
    title: `${t("moderation.pages.bans_title")} — ${t("nav.moderation")}`,
    description: t("moderation.pages.bans_description"),
  };
}

export const dynamic = "force-dynamic";

export default async function BansPage() {
  await requireModServer();
  const { t } = getTranslations(await getServerLocale());

  return (
    <div className="space-y-6" data-testid="bans-manager-page">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
          {t("moderation.pages.bans_title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {t("moderation.pages.bans_description")}
        </p>
      </div>

      <BansManager />
    </div>
  );
}
