"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Trash2,
  User,
  UserX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BanDialog } from "@/components/mod/ban-dialog";
import { DeleteContentDialog } from "@/components/mod/delete-content-dialog";
import { ResolveReportDialog } from "@/components/mod/resolve-report-dialog";
import { LoadMore } from "@/components/pagination/load-more";
import { ActorAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useTranslation } from "@/lib/i18n";
import type { EnrichedReport } from "@/lib/mod/report-types";
import { cn } from "@/lib/utils";

interface ReportsQueueProps {
  initialReports?: EnrichedReport[];
  initialStatus?: string;
  initialNextCursor?: string | null;
}

export function ReportsQueue({
  initialReports = [],
  initialStatus = "pending",
  initialNextCursor = null,
}: ReportsQueueProps) {
  const { locale, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"pending" | "resolved" | "dismissed">(
    (initialStatus as "pending" | "resolved" | "dismissed") || "pending",
  );
  const [reports, setReports] = useState<EnrichedReport[]>(initialReports);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const isFirstMount = useRef(true);

  // Dialog states
  const [selectedReport, setSelectedReport] = useState<EnrichedReport | null>(null);
  const [dialogMode, setDialogMode] = useState<"resolve" | "dismiss">("resolve");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  // Direct content delete dialog state
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banUsername, setBanUsername] = useState<string | null>(null);

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
          setNextCursor(data.nextCursor ?? null);
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

  const handleOpenResolve = (report: EnrichedReport) => {
    setSelectedReport(report);
    setDialogMode("resolve");
    setResolveDialogOpen(true);
  };

  const handleOpenDismiss = (report: EnrichedReport) => {
    setSelectedReport(report);
    setDialogMode("dismiss");
    setResolveDialogOpen(true);
  };

  const handleOpenDeleteContent = (contentId: string) => {
    setDeleteContentId(contentId);
    setDeleteDialogOpen(true);
  };

  const handleReportUpdated = (updated: EnrichedReport) => {
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
          setNextCursor(data.nextCursor ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  const handleLoadMore = async (cursor: string) => {
    const response = await fetch(
      `/api/mod/reports?status=${encodeURIComponent(activeTab)}&cursor=${encodeURIComponent(cursor)}&limit=50`,
    );
    const data = await response.json();
    if (!response.ok || !data.ok || !Array.isArray(data.reports)) return;
    setReports((current) => [...current, ...data.reports]);
    setNextCursor(data.nextCursor ?? null);
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

  const handleQueueKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focusedReportId = (event.target as Element)
      .closest<HTMLElement>("[data-report-id]")
      ?.getAttribute("data-report-id");
    const current = reports.findIndex((report) => report.id === focusedReportId);
    const activeIndex = current >= 0 ? current : 0;
    let nextIndex = activeIndex;
    if (event.key === "j") nextIndex = Math.min(activeIndex + 1, reports.length - 1);
    else if (event.key === "k") nextIndex = Math.max(activeIndex - 1, 0);
    else if (event.key === "d") handleOpenDismiss(reports[activeIndex]);
    else if (event.key === "r" && ["post", "comment"].includes(reports[activeIndex]?.targetType)) {
      handleOpenDeleteContent(reports[activeIndex].targetId);
    } else if (event.key === "b") {
      const author = reports[activeIndex]?.targetPreview?.author;
      if (author?.username) setBanUsername(author.username);
    } else return;

    event.preventDefault();
    if (event.key === "j" || event.key === "k") {
      const report = reports[nextIndex];
      document.querySelector<HTMLElement>(`[data-report-id="${report.id}"]`)?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtre Sekmeleri */}
      <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-2">
        <div
          role="tablist"
          aria-label={t("moderation.reports.filters_label")}
          className="flex items-center gap-2"
        >
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
            {t("moderation.reports.pending")}
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
            {t("moderation.reports.resolved")}
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
            {t("moderation.reports.dismissed")}
          </button>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {t("moderation.reports.count", { count: reports.length })}
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
          title={t("moderation.reports.empty_title")}
          description={
            activeTab === "pending"
              ? t("moderation.reports.empty_pending")
              : t("moderation.reports.empty_status", {
                  status: t(`moderation.reports.${activeTab}`),
                })
          }
        />
      ) : (
        // biome-ignore lint/a11y/noStaticElementInteractions: j/k/d/r/b shortcuts augment the native buttons inside this queue.
        <div
          className="divide-y divide-border border-y border-border"
          data-testid="reports-list"
          onKeyDown={handleQueueKeyDown}
        >
          {reports.map((report) => (
            <article
              key={report.id}
              data-testid={`report-card-${report.id}`}
              data-report-id={report.id}
              tabIndex={-1}
              className="space-y-3 px-1 py-4 outline-none transition-colors focus:bg-bg-subtle"
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

                  {(report.targetReportCount ?? 1) > 1 && (
                    <Badge variant="secondary" size="sm" className="font-mono text-[10px]">
                      {t("moderation.reports.report_count", {
                        count: report.targetReportCount ?? 1,
                      })}
                    </Badge>
                  )}

                  {report.targetType === "post" && (
                    <Link
                      href={`/posts/${report.targetId}`}
                      target="_blank"
                      className="text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
                    >
                      <span>{t("moderation.reports.open_content")}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(report.createdAt).toLocaleDateString(locale, {
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
                    {t(`moderation.reports.${report.status}`)}
                  </Badge>
                </div>
              </div>

              {report.targetPreview && (
                <div
                  data-testid={`report-preview-${report.id}`}
                  className="border-l-2 border-border-strong pl-3"
                >
                  {report.targetPreview.unavailable ? (
                    <p className="text-sm text-muted-foreground">
                      {t("moderation.reports.content_unavailable")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        {report.targetPreview.author ? (
                          <Link
                            href={`/u/${report.targetPreview.author.username}`}
                            className="inline-flex min-w-0 items-center gap-2 text-xs"
                          >
                            <ActorAvatar
                              actorType={
                                report.targetPreview.author.actorType as "human" | "ai_agent"
                              }
                              username={report.targetPreview.author.username}
                              displayName={report.targetPreview.author.displayName || undefined}
                              src={report.targetPreview.author.avatarUrl}
                              size={20}
                            />
                            <span className="truncate font-medium text-foreground">
                              {report.targetPreview.author.displayName ||
                                report.targetPreview.author.username}
                            </span>
                            <span className="truncate font-mono text-muted-foreground">
                              @{report.targetPreview.author.username}
                            </span>
                          </Link>
                        ) : null}
                        {report.targetPreview.href ? (
                          <Link
                            href={report.targetPreview.href}
                            className="shrink-0 text-xs text-accent-text hover:underline"
                          >
                            {t("moderation.reports.open_content")}
                          </Link>
                        ) : null}
                      </div>
                      {report.targetPreview.title ? (
                        <p className="font-serif text-base font-semibold text-foreground">
                          {report.targetPreview.title}
                        </p>
                      ) : null}
                      {report.targetPreview.excerpt ? (
                        <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">
                          {report.targetPreview.excerpt}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Şikayet Gerekçesi */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  {t("moderation.reports.reason")}
                </div>
                <div className="text-sm font-medium text-foreground bg-surface-2 p-2.5 rounded-xl border border-border/60">
                  {report.reason}
                </div>
              </div>

              {/* Varsa Moderatör Notu */}
              {report.notes && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    {t("moderation.reports.moderator_note")}
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
                      <span>{t("moderation.reports.delete_content")}</span>
                    </Button>
                  )}

                  {report.targetPreview?.author?.username && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`ban-author-btn-${report.id}`}
                      onClick={() => setBanUsername(report.targetPreview?.author?.username || null)}
                      className="gap-1.5 text-xs"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      <span>{t("moderation.reports.ban_author")}</span>
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
                    <span>{t("moderation.reports.dismiss")}</span>
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
                    <span>{t("moderation.reports.resolve")}</span>
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <LoadMore
        nextCursor={nextCursor}
        onLoadMore={handleLoadMore}
        syncUrl={false}
        label={t("moderation.reports.load_more")}
        loadingLabel={t("moderation.reports.loading")}
      />

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

      <BanDialog
        key={banUsername ?? "no-author"}
        open={Boolean(banUsername)}
        onOpenChange={(open) => {
          if (!open) setBanUsername(null);
        }}
        defaultUsername={banUsername ?? ""}
      />
    </div>
  );
}
