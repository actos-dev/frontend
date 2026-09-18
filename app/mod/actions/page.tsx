import type { Metadata } from "next";
import { ActionsList } from "@/components/mod/actions-list";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { requireModServer } from "@/lib/mod/auth";
import { listAuditLogs } from "@/lib/mod/client-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  return {
    title: `${t("moderation.pages.actions_title")} — ${t("nav.moderation")}`,
    description: t("moderation.pages.actions_description"),
  };
}

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const { client } = await requireModServer();
  const { t } = getTranslations(await getServerLocale());

  const actionsPage = await listAuditLogs(client, { limit: 100 }).catch(() => ({
    items: [],
    nextCursor: null,
  }));

  return (
    <div className="space-y-6" data-testid="actions-audit-page">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
          {t("moderation.pages.actions_title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {t("moderation.pages.actions_description")}
        </p>
      </div>

      <ActionsList initialActions={actionsPage.items} initialNextCursor={actionsPage.nextCursor} />
    </div>
  );
}
