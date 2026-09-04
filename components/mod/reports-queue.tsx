"use client";

import type { Report } from "actos";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DeleteContentDialog } from "@/components/mod/delete-content-dialog";
import { ResolveReportDialog } from "@/components/mod/resolve-report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface ReportsQueueProps {
  initialReports?: Report[];
  initialStatus?: string;
}

export function ReportsQueue({
  initialReports = [],
  initialStatus = "pending",
}: ReportsQueueProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "resolved" | "dismissed">(
    (initialStatus as "pending" | "resolved" | "dismissed") || "pending",
  );
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [isLoading, setIsLoading] = useState(false);
  const isFirstMount = useRef(true);

  // Dialog states
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dialogMode, setDialogMode] = useState<"resolve" | "dismiss">("resolve");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  // Direct content delete dialog state
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    fetch(`/api/mod/reports?status=${activeTab}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.ok && Array.isArray(data.reports)) {
          setReports(data.reports);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab]);

  const handleOpenResolve = (report: Report) => {
    setSelectedReport(report);
    setDialogMode("resolve");
    setResolveDialogOpen(true);
  };

  const handleOpenDismiss = (report: Report) => {
    setSelectedReport(report);
    setDialogMode("dismiss");
    setResolveDialogOpen(true);
  };

  const handleOpenDeleteContent = (contentId: string) => {
    setDeleteContentId(contentId);
    setDeleteDialogOpen(true);
  };

  const handleReportUpdated = (updated: Report) => {
    setReports((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)).filter((r) => r.status === activeTab),
    );
  };

  const handleContentDeleted = () => {
    setIsLoading(true);
    fetch(`/api/mod/reports?status=${activeTab}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.reports)) {
          setReports(data.reports);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case "comment":
        return <MessageSquare className="w-3.5 h-3.5" />;
      case "actor":
        return <User className="w-3.5 h-3.5" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtre Sekmeleri */}
      <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-2">
        <div role="tablist" aria-label="Rapor Durum Filtreleri" className="flex items-center gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pending"}
            data-testid="tab-pending-reports"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
              activeTab === "pending"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-surface-2 text-muted-foreground hover:text-foreground",
            )}
          >
            Bekleyen
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "resolved"}
            data-testid="tab-resolved-reports"
            onClick={() => setActiveTab("resolved")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
              activeTab === "resolved"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-surface-2 text-muted-foreground hover:text-foreground",
            )}
          >
            Çözülen
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "dismissed"}
            data-testid="tab-dismissed-reports"
            onClick={() => setActiveTab("dismissed")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
              activeTab === "dismissed"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-surface-2 text-muted-foreground hover:text-foreground",
            )}
          >
            Reddedilen
          </button>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {reports.length} rapor listelendi
        </div>
      </div>

      {/* Rapor Listesi */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-surface-2/60 animate-pulse border border-border/60"
            />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Moderasyon kuyruğu tertemiz"
          description={
            activeTab === "pending"
              ? "Harika haber! Şu anda incelenmeyi bekleyen şikayet yok."
              : `${activeTab} durumunda kayıtlı rapor bulunmuyor.`
          }
        />
      ) : (
        <div className="space-y-3" data-testid="reports-list">
          {reports.map((report) => (
            <div
              key={report.id}
              data-testid={`report-card-${report.id}`}
              className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-border transition-colors space-y-3"
            >
              {/* Kart Başlığı: Hedef, Durum ve Tarih */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    size="sm"
                    className="gap-1 font-mono uppercase text-[10px]"
                  >
                    {getTargetIcon(report.targetType)}
                    <span>{report.targetType}</span>
                  </Badge>

                  <span className="font-mono text-muted-foreground font-medium">
                    ID: {report.targetId}
                  </span>

                  {report.targetType === "post" && (
                    <Link
                      href={`/posts/${report.targetId}`}
                      target="_blank"
                      className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
                    >
                      <span>İçeriği Aç</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(report.createdAt).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  <Badge
                    variant={
                      report.status === "pending"
                        ? "destructive"
                        : report.status === "resolved"
                          ? "default"
                          : "secondary"
                    }
                    size="sm"
                    className="font-mono text-[10px] uppercase"
                  >
                    {report.status === "pending" && "Bekleyen"}
                    {report.status === "resolved" && "Çözüldü"}
                    {report.status === "dismissed" && "Reddedildi"}
                  </Badge>
                </div>
              </div>

              {/* Şikayet Gerekçesi */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  Şikayet Gerekçesi
                </div>
                <div className="text-sm font-medium text-foreground bg-surface-2 p-2.5 rounded-xl border border-border/60">
                  {report.reason}
                </div>
              </div>

              {/* Varsa Moderatör Notu */}
              {report.notes && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    Moderatör Notu
                  </div>
                  <div className="text-xs text-foreground bg-primary/5 p-2.5 rounded-xl border border-primary/20">
                    {report.notes}
                  </div>
                </div>
              )}

              {/* Bekleyen Raporlar İçin Aksiyonlar */}
              {report.status === "pending" && (
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/60">
                  {(report.targetType === "post" || report.targetType === "comment") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`delete-content-btn-${report.id}`}
                      onClick={() => handleOpenDeleteContent(report.targetId)}
                      className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:border-destructive/40 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>İçeriği Sil</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid={`dismiss-report-btn-${report.id}`}
                    onClick={() => handleOpenDismiss(report)}
                    className="gap-1.5 text-xs rounded-xl"
                  >
                    <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Reddet</span>
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    data-testid={`resolve-report-btn-${report.id}`}
                    onClick={() => handleOpenResolve(report)}
                    className="gap-1.5 text-xs rounded-xl"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Çözümle</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Çözüm / Reddet Dialog */}
      <ResolveReportDialog
        report={selectedReport}
        mode={dialogMode}
        open={resolveDialogOpen}
        onOpenChange={setResolveDialogOpen}
        onSuccess={handleReportUpdated}
      />

      {/* Doğrudan İçerik Silme Dialog */}
      <DeleteContentDialog
        contentId={deleteContentId}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleContentDeleted}
      />
    </div>
  );
}
