import type { Metadata } from "next";
import { ActionsList } from "@/components/mod/actions-list";
import { requireModServer } from "@/lib/mod/auth";
import { listAuditLogs } from "@/lib/mod/client-actions";

export const metadata: Metadata = {
  title: "Denetim Kaydı — Moderasyon",
  description: "Yönetici ve moderatör eylemlerinin kronolojik denetim kütüğü.",
};

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const { client } = await requireModServer();

  const actionsPage = await listAuditLogs(client, { limit: 100 }).catch(() => ({
    items: [],
    nextCursor: null,
  }));

  return (
    <div className="space-y-6" data-testid="actions-audit-page">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
          Denetim İzi ve Moderasyon Kütüğü
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Değiştirilemez, salt okunur kronolojik denetim geçmişi.
        </p>
      </div>

      <ActionsList initialActions={actionsPage.items} initialNextCursor={actionsPage.nextCursor} />
    </div>
  );
}
