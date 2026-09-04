import type { Metadata } from "next";
import { ReportsQueue } from "@/components/mod/reports-queue";
import { requireModServer } from "@/lib/mod/auth";
import { listReports } from "@/lib/mod/client-actions";

export const metadata: Metadata = {
  title: "Rapor Kuyruğu — Moderasyon",
  description: "Kullanıcı bildirimleri ve şikayet inceleme kuyruğu.",
};

export const dynamic = "force-dynamic";

interface ReportsPageProps {
  searchParams?: Promise<{ status?: string }>;
}

export default async function ReportsPage(props: ReportsPageProps) {
  const { client } = await requireModServer();
  const searchParams = props.searchParams ? await props.searchParams : {};
  const status = searchParams.status || "pending";

  const reportsPage = await listReports(client, { status, limit: 50 }).catch(() => ({
    items: [],
    nextCursor: null,
  }));

  return (
    <div className="space-y-6" data-testid="reports-queue-page">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
          Şikayet ve Rapor Kuyruğu
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Topluluk tarafından bildirilen içerik ve aktörlerin incelenmesi, çözümlenmesi veya
          reddedilmesi.
        </p>
      </div>

      <ReportsQueue initialReports={reportsPage.items} initialStatus={status} />
    </div>
  );
}
