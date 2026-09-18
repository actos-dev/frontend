"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type PostTargetStatus =
  | "independent"
  | "checking"
  | "member"
  | "not_member"
  | "not_found"
  | "error";

export interface PostTargetValue {
  name: string | null;
  status: PostTargetStatus;
  canPublish: boolean;
}

export interface PostTargetFieldProps {
  initialName?: string | null;
  disabled?: boolean;
  onResolved: (value: PostTargetValue) => void;
}

/**
 * The composer's `Post to` field (ROADMAP §3/§7.2). The 0.3.0 API cannot list
 * the communities a viewer belongs to (BE-016), so instead of a fake
 * joined-communities dropdown this is a name input validated live against
 * `GET /communities/{name}`. It shows the resolved name and membership state
 * before publishing, and refuses to publish into a community the viewer is not
 * a member of (posting requires membership).
 */
export function PostTargetField({
  initialName = "",
  disabled = false,
  onResolved,
}: PostTargetFieldProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState(initialName ?? "");
  const [status, setStatus] = useState<PostTargetStatus>(initialName ? "checking" : "independent");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const callbackRef = useRef(onResolved);
  callbackRef.current = onResolved;

  useEffect(() => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) {
      setStatus("independent");
      setResolvedName(null);
      return;
    }

    setStatus("checking");
    setResolvedName(null);

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/communities/${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (controller.signal.aborted) return;

        if (res.status === 404) {
          setStatus("not_found");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }

        const data = await res.json();
        const community = data?.community as
          | { name: string; visibility: string; isMember: boolean }
          | undefined;
        if (!community) {
          setStatus("error");
          return;
        }

        setResolvedName(community.name);
        const isCover = community.visibility === "private" && !community.isMember;
        setStatus(isCover || !community.isMember ? "not_member" : "member");
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        setStatus("error");
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [input]);

  useEffect(() => {
    const trimmed = input.trim().toLowerCase();
    const name = status === "independent" ? null : (resolvedName ?? trimmed ?? null);
    callbackRef.current({
      name,
      status,
      canPublish: status === "independent" || status === "member",
    });
  }, [status, resolvedName, input]);

  const statusText = (() => {
    switch (status) {
      case "independent":
        return t("editor.independent");
      case "checking":
        return t("editor.community_checking");
      case "member":
        return t("editor.community_member", { name: resolvedName ?? "" });
      case "not_member":
        return t("editor.community_not_member", { name: resolvedName ?? input.trim() });
      case "not_found":
        return t("editor.community_not_found", { name: input.trim() });
      case "error":
        return t("editor.community_error");
    }
  })();

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          data-testid="post-target-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("editor.community_placeholder")}
          disabled={disabled}
          aria-label={t("editor.community_name_label")}
          autoComplete="off"
          spellCheck={false}
          className="pr-9"
        />
        {status === "checking" ? (
          <Loader2
            aria-hidden="true"
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fg-subtle"
          />
        ) : null}
      </div>
      <p
        data-testid="post-target-status"
        aria-live="polite"
        className={cn(
          "text-xs",
          status === "member" && "text-success",
          status === "not_member" && "text-danger",
          status === "not_found" && "text-danger",
          status === "error" && "text-danger",
          (status === "independent" || status === "checking") && "text-fg-muted",
        )}
      >
        {statusText}
      </p>
    </div>
  );
}
