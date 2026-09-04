import { AlertTriangle, ArrowRight, Ban, Clock, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireModServer } from "@/lib/mod/auth";
import { listAuditLogs, listBans, listReports } from "@/lib/mod/client-actions";

export const dynamic = "force-dynamic";

export default async function ModSummaryPage() {
  const { client, isAdmin } = await requireModServer();

  const [reportsPage, bans, actionsPage] = await Promise.all([
    listReports(client, { status: "pending", limit: 100 }).catch(() => ({
      items: [],
      nextCursor: null,
    })),
    listBans(client).catch(() => []),
    listAuditLogs(client, { limit: 50 }).catch(() => ({ items: [], nextCursor: null })),
  ]);

  const pendingReportsCount = reportsPage.items.length;
  const activeBansCount = bans.length;

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const last24hActionsCount = actionsPage.items.filter(
    (a) => new Date(a.createdAt).getTime() >= oneDayAgo,
  ).length;

  const recentActions = actionsPage.items.slice(0, 5);

  return (
    <div className="space-y-8" data-testid="mod-summary-view">
      {/* Sayfa Başlığı */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
          Moderasyon Genel Bakış
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Topluluk güvenliği, bekleyen şikayetler ve sistem denetim izi metrikleri.
        </p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Bekleyen Raporlar */}
        <Link
          href="/mod/reports"
          data-testid="stat-pending-reports"
          className="group p-5 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-primary/50 transition-all space-y-3 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase font-mono tracking-wider">
              Bekleyen Raporlar
            </span>
            <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              data-testid="pending-reports-count"
              className="text-3xl font-bold font-mono text-foreground"
            >
              {pendingReportsCount}
            </span>
            <span className="text-xs text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium">
              İncele <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Aktif Banlar */}
        <Link
          href="/mod/bans"
          data-testid="stat-active-bans"
          className="group p-5 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-primary/50 transition-all space-y-3 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase font-mono tracking-wider">
              Aktif Yasaklamalar
            </span>
            <div className="w-8 h-8 rounded-xl bg-surface-2 text-foreground flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              data-testid="active-bans-count"
              className="text-3xl font-bold font-mono text-foreground"
            >
              {activeBansCount}
            </span>
            <span className="text-xs text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium">
              Yönet <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Son 24 Saatlik Eylemler */}
        <Link
          href="/mod/actions"
          data-testid="stat-24h-actions"
          className="group p-5 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-primary/50 transition-all space-y-3 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase font-mono tracking-wider">
              Son 24 Saat Eylemleri
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span
              data-testid="recent-actions-count"
              className="text-3xl font-bold font-mono text-foreground"
            >
              {last24hActionsCount}
            </span>
            <span className="text-xs text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium">
              Kütüğü Gör <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* Hızlı İşlem Kısayolları */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">
          Hızlı İşlemler
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-auto py-3 px-3.5 rounded-xl border-border/80 hover:bg-surface-2 justify-start gap-2.5"
          >
            <Link href="/mod/reports" data-testid="quick-action-reports">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <div className="text-left">
                <div className="text-xs font-semibold">Raporları İncele</div>
                <div className="text-[10px] text-muted-foreground">Kuyrukta bekleyenler</div>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-auto py-3 px-3.5 rounded-xl border-border/80 hover:bg-surface-2 justify-start gap-2.5"
          >
            <Link href="/mod/bans" data-testid="quick-action-bans">
              <Ban className="w-4 h-4 text-destructive" />
              <div className="text-left">
                <div className="text-xs font-semibold">Ban Yönetimi</div>
                <div className="text-[10px] text-muted-foreground">Yasakla veya kaldır</div>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-auto py-3 px-3.5 rounded-xl border-border/80 hover:bg-surface-2 justify-start gap-2.5"
          >
            <Link href="/mod/actions" data-testid="quick-action-actions">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div className="text-left">
                <div className="text-xs font-semibold">Denetim Kaydı</div>
                <div className="text-[10px] text-muted-foreground">Geçmiş işlem izi</div>
              </div>
            </Link>
          </Button>

          {isAdmin && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-auto py-3 px-3.5 rounded-xl border-border/80 hover:bg-surface-2 justify-start gap-2.5"
            >
              <Link href="/mod/roles" data-testid="quick-action-roles">
                <UserCheck className="w-4 h-4 text-primary" />
                <div className="text-left">
                  <div className="text-xs font-semibold">Rol Yönetimi</div>
                  <div className="text-[10px] text-muted-foreground">Yalnızca admin</div>
                </div>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Son Denetim Eylemleri Özeti */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">
            Son Moderasyon Eylemleri
          </h2>
          <Button asChild variant="ghost" size="sm" className="text-xs gap-1 rounded-xl">
            <Link href="/mod/actions">
              <span>Tümünü Gör</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        {recentActions.length === 0 ? (
          <div className="p-6 rounded-2xl border border-border/80 bg-card text-center text-xs text-muted-foreground">
            Henüz kaydedilmiş bir moderasyon eylemi bulunmuyor.
          </div>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <div className="divide-y divide-border/60">
              {recentActions.map((action) => (
                <div
                  key={action.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-surface-2/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Badge variant="outline" size="sm" className="font-mono text-[10px] uppercase">
                      {action.actionType}
                    </Badge>
                    <span className="font-mono text-muted-foreground">@{action.adminUsername}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-foreground">
                      {action.targetType}:{action.targetId}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground">
                    {action.reason && (
                      <span className="italic max-w-xs truncate text-[11px]">
                        &quot;{action.reason}&quot;
                      </span>
                    )}
                    <span className="font-mono text-[11px] whitespace-nowrap">
                      {new Date(action.createdAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
