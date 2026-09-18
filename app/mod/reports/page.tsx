import type { Metadata } from "next";
import { ReportsQueue } from "@/components/mod/reports-queue";
import { getServerLocale, getTranslations } from "@/lib/i18n";
import { requireModServer } from "@/lib/mod/auth";
import { listReports } from "@/lib/mod/client-actions";
import { enrichReports } from "@/lib/mod/report-enrichment";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getTranslations(await getServerLocale());
  return {
    title: `${t("moderation.pages.reports_title")} — ${t("nav.moderation")}`,
    description: t("moderation.pages.reports_description"),
  };
}

export const dynamic = "force-dynamic";

interface ReportsPageProps {
  searchParams?: Promise<{ status?: string }>;
}

export default async function ReportsPage(props: ReportsPageProps) {
  const { client } = await requireModServer();
  const { t } = getTranslations(await getServerLocale());
  const searchParams = props.searchParams ? await props.searchParams : {};
  const status = searchParams.status || "pending";

  const reportsPage = await listReports(client, { status, limit: 50 }).catch(() => ({
    items: [],
    nextCursor: null,
  }));
  const reports = await enrichReports(client, reportsPage.items);

  return (
    <div className="space-y-6" data-testid="reports-queue-page">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
          {t("moderation.pages.reports_title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {t("moderation.pages.reports_description")}
        </p>
      </div>

      <ReportsQueue
        initialReports={reports}
        initialStatus={status}
        initialNextCursor={reportsPage.nextCursor}
      />
    </div>
  );
}
