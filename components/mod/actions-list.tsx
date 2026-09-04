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
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

interface ActionsListProps {
  initialActions?: AdminAction[];
}

export function ActionsList({ initialActions = [] }: ActionsListProps) {
  const [actions] = useState<AdminAction[]>(initialActions);
  const [searchQuery, setSearchQuery] = useState("");

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case "actor_ban":
        return (
          <Badge variant="destructive" size="sm" className="gap-1 font-mono uppercase text-[10px]">
            <Ban className="w-3 h-3" />
            <span>Kullanıcı Banlandı</span>
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
            <span>Ban Kaldırıldı</span>
          </Badge>
        );
      case "content_delete":
        return (
          <Badge variant="destructive" size="sm" className="gap-1 font-mono uppercase text-[10px]">
            <Trash2 className="w-3 h-3" />
            <span>İçerik Silindi</span>
          </Badge>
        );
      case "report_update":
        return (
          <Badge variant="secondary" size="sm" className="gap-1 font-mono uppercase text-[10px]">
            <FileText className="w-3 h-3" />
            <span>Rapor Güncellendi</span>
          </Badge>
        );
      case "role_grant":
        return (
          <Badge variant="default" size="sm" className="gap-1 font-mono uppercase text-[10px]">
            <UserCheck className="w-3 h-3" />
            <span>Rol Atandı</span>
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
            <span>Rol Kaldırıldı</span>
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
          <h2 className="text-base font-bold text-foreground">Denetim Kütüğü (Audit Log)</h2>
          <p className="text-xs text-muted-foreground">
            Yöneticiler ve moderatörler tarafından gerçekleştirilen tüm eylemlerin salt okunur
            kaydı.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kütükte ara..."
            className="pl-8 text-xs h-8 rounded-xl"
            data-testid="audit-log-search-input"
          />
        </div>
      </div>

      {/* Kütük Tablosu / Listesi */}
      {filteredActions.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Denetim kaydı bulunamadı"
          description={
            searchQuery
              ? "Arama kriterlerine uygun işlem kaydı yok."
              : "Henüz bir moderasyon işlemi kaydedilmedi."
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
                  <th className="py-3 px-4 font-semibold">Tarih</th>
                  <th className="py-3 px-4 font-semibold">Eylem</th>
                  <th className="py-3 px-4 font-semibold">Yapan</th>
                  <th className="py-3 px-4 font-semibold">Hedef</th>
                  <th className="py-3 px-4 font-semibold">Gerekçe / Not</th>
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
                        {new Date(action.createdAt).toLocaleDateString("tr-TR", {
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
    </div>
  );
}
