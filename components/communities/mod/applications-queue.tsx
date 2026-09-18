"use client";

import type { Application } from "actos";
import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { ActorAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";

type Status = "pending" | "accepted" | "rejected";

const STATUS_TABS: Status[] = ["pending", "accepted", "rejected"];

export interface ApplicationsQueueProps {
  communityName: string;
  initialApplications: Application[];
  initialNextCursor: string | null;
}

/**
 * The community mod screen's applications queue. Status is a server-side
 * filter (`?status=`), so switching tabs refetches rather than filtering a
 * partial page. Approve/reject removes the row only after a 204.
 */
export function ApplicationsQueue({
  communityName,
  initialApplications,
  initialNextCursor,
}: ApplicationsQueueProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("pending");
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (nextStatus: Status, cursor?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ status: nextStatus, limit: "25" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(
        `/api/communities/${encodeURIComponent(communityName)}/applications?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.detail || t("communities.mod.applications.action_failed"));
        return;
      }
      const items: Application[] = data.applications || [];
      setApplications((current) => (cursor ? [...current, ...items] : items));
      setNextCursor(data.nextCursor ?? null);
    } catch {
      toast.error(t("communities.mod.applications.action_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (nextStatus: Status) => {
    setStatus(nextStatus);
    void load(nextStatus);
  };

  const resolve = async (application: Application, action: "accept" | "reject") => {
    if (busyId) return;
    setBusyId(application.id);
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(communityName)}/applications/${encodeURIComponent(application.id)}/${action}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.detail || t("communities.mod.applications.action_failed"));
        return;
      }
      setApplications((current) => current.filter((item) => item.id !== application.id));
      toast.success(
        action === "accept"
          ? t("communities.mod.applications.approve_success")
          : t("communities.mod.applications.reject_success"),
      );
    } catch {
      toast.error(t("communities.mod.applications.action_failed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="applications-queue">
      <div>
        <h2 className="text-sm font-semibold text-fg">{t("communities.mod.applications.title")}</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          {t("communities.mod.applications.description")}
        </p>
      </div>

      <div
        role="tablist"
        aria-label={t("communities.mod.applications.filter_label")}
        className="flex items-center gap-2"
      >
        {STATUS_TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            data-testid={`applications-status-${value}`}
            onClick={() => handleStatusChange(value)}
            className={
              status === value
                ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
                : "rounded-full bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-fg-muted hover:text-fg"
            }
          >
            {t(`communities.mod.applications.status_${value}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 py-6 text-xs text-fg-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {t("communities.mod.applications.loading")}
        </p>
      ) : applications.length === 0 ? (
        <EmptyState
          title={t(
            status === "pending"
              ? "communities.mod.applications.empty_pending"
              : "communities.mod.applications.empty",
          )}
        />
      ) : (
        <ul className="divide-y divide-border" data-testid="applications-list">
          {applications.map((application) => {
            const applicant = application.applicant;
            const isBusy = busyId === application.id;
            return (
              <li
                key={application.id}
                data-testid={`application-row-${application.id}`}
                className="space-y-2 py-4"
              >
                <div className="flex items-center gap-2.5">
                  <ActorAvatar
                    actorType={applicant.actorType === "ai_agent" ? "ai_agent" : "human"}
                    username={applicant.username}
                    displayName={applicant.displayName || undefined}
                    src={applicant.avatarUrl}
                    size={28}
                  />
                  <span className="text-sm font-medium text-fg">
                    {applicant.displayName || applicant.username}
                  </span>
                  <span className="font-mono text-xs text-fg-subtle">@{applicant.username}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-fg-muted">{application.reason}</p>
                {application.status === "pending" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      data-testid={`application-approve-${application.id}`}
                      disabled={isBusy}
                      onClick={() => resolve(application, "accept")}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t("communities.mod.applications.approve")}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`application-reject-${application.id}`}
                      disabled={isBusy}
                      onClick={() => resolve(application, "reject")}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t("communities.mod.applications.reject")}</span>
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => load(status, nextCursor)}
          >
            {t("communities.mod.applications.load_more")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
