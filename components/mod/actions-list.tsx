"use client";

import type { AdminAction } from "actos";
import {
  Ban,
  Calendar,
  CheckCircle2,
  FileText,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { LoadMore } from "@/components/pagination/load-more";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";

interface ActionsListProps {
  initialActions?: AdminAction[];
  initialNextCursor?: string | null;
}

export function ActionsList({ initialActions = [], initialNextCursor = null }: ActionsListProps) {
  const { locale, t } = useTranslation();
  const [actions, setActions] = useState<AdminAction[]>(initialActions);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLoadMore = async (cursor: string) => {
    const response = await fetch(`/api/mod/actions?cursor=${encodeURIComponent(cursor)}&limit=100`);
    const data = await response.json();
    if (!response.ok || !data.ok || !Array.isArray(data.actions)) return;
    setActions((current) => [...current, ...data.actions]);
    setNextCursor(data.nextCursor ?? null);
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case "actor_ban":
        return (
          <Badge variant="destructive" size="sm" className="gap-1 font-mono uppercase text-[10px]">
            <Ban className="w-3 h-3" />
            <span>{t("moderation.actions.actor_ban")}</span>
          </Badge>
        );
      case "actor_unban":
        return (
          <Badge
            variant="default"
            size="sm"
            className="gap-1 font-mono uppercase text-[10px] bg-success text-success-foreground"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{t("moderation.actions.actor_unban")}</span>
          </Badge>
        );
      case "content_delete":
        return (
          <Badge variant="destructive" size="sm" className="gap-1 font-mono uppercase text-[10px]">
            <Trash2 className="w-3 h-3" />
            <span>{t("moderation.actions.content_delete")}</span>
          </Badge>
        );
      case "report_update":
        return (
          <Badge variant="secondary" size="sm" className="gap-1 font-mono uppercase text-[10px]">
            <FileText className="w-3 h-3" />
            <span>{t("moderation.actions.report_update")}</span>
          </Badge>
        );
      case "role_grant":
        return (
          <Badge variant="default" size="sm" className="gap-1 font-mono uppercase text-[10px]">
            <UserCheck className="w-3 h-3" />
            <span>{t("moderation.actions.role_grant")}</span>
          </Badge>
        );
      case "role_revoke":
        return (
          <Badge
            variant="outline"
            size="sm"
            className="gap-1 font-mono uppercase text-[10px] text-muted-foreground"
          >
            <UserX className="w-3 h-3" />
            <span>{t("moderation.actions.role_revoke")}</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" size="sm" className="gap-1 font-mono uppercase text-[10px]">
            <Shield className="w-3 h-3" />
            <span>{actionType}</span>
          </Badge>
        );
    }
  };

  const filteredActions = actions.filter((act) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      act.adminUsername?.toLowerCase().includes(q) ||
      act.actionType?.toLowerCase().includes(q) ||
      act.reason?.toLowerCase().includes(q) ||
      String(act.targetId).includes(q) ||
      act.targetType?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Filtre */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h2 className="text-base font-bold text-foreground">{t("moderation.actions.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("moderation.actions.description")}</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("moderation.actions.search_placeholder")}
            className="pl-8 text-xs h-8 rounded-xl"
            data-testid="audit-log-search-input"
          />
        </div>
      </div>

      {/* Kütük Tablosu / Listesi */}
      {filteredActions.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={t("moderation.actions.empty")}
          description={
            searchQuery
              ? t("moderation.actions.empty_search")
              : t("moderation.actions.empty_default")
          }
        />
      ) : (
        <div
          data-testid="audit-log-table"
          className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-surface-2/70 text-muted-foreground font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold">{t("moderation.actions.date")}</th>
                  <th className="py-3 px-4 font-semibold">{t("moderation.actions.action")}</th>
                  <th className="py-3 px-4 font-semibold">{t("moderation.actions.actor")}</th>
                  <th className="py-3 px-4 font-semibold">{t("moderation.actions.target")}</th>
                  <th className="py-3 px-4 font-semibold">{t("moderation.actions.reason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredActions.map((action) => (
                  <tr
                    key={action.id}
                    data-testid={`audit-log-row-${action.id}`}
                    className="hover:bg-surface-2/40 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(action.createdAt).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(action.actionType)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono font-medium text-foreground">
                      @{action.adminUsername}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-muted-foreground">
                      <span className="bg-surface-2 px-2 py-0.5 rounded-md border border-border/60">
                        {action.targetType}:{action.targetId}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-md text-foreground">
                      {action.reason ? (
                        <span className="line-clamp-2">{action.reason}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LoadMore
        nextCursor={nextCursor}
        onLoadMore={handleLoadMore}
        syncUrl={false}
        label={t("moderation.actions.load_more")}
        loadingLabel={t("moderation.actions.loading")}
      />
    </div>
  );
}
