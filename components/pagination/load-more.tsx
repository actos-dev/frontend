"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { syncCursorToUrl } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export interface LoadMoreProps {
  nextCursor?: string | null;
  hasMore?: boolean;
  onLoadMore?: (cursor: string) => Promise<void> | void;
  isLoading?: boolean;
  syncUrl?: boolean;
  label?: string;
  loadingLabel?: string;
  endMessage?: string | null;
  className?: string;
}

export function LoadMore({
  nextCursor,
  hasMore,
  onLoadMore,
  isLoading: propLoading = false,
  syncUrl = true,
  label = "Daha fazla",
  loadingLabel = "Yükleniyor...",
  endMessage = null,
  className,
}: LoadMoreProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = propLoading || internalLoading;

  const canLoadMore = hasMore !== undefined ? hasMore : Boolean(nextCursor);

  if (!canLoadMore && !loading) {
    if (!endMessage) return null;
    return (
      <div className={cn("py-6 text-center text-xs text-muted-foreground", className)}>
        {endMessage}
      </div>
    );
  }

  const handleClick = async () => {
    if (!nextCursor || loading) return;

    if (syncUrl) {
      syncCursorToUrl(nextCursor, "push");
    }

    if (onLoadMore) {
      setInternalLoading(true);
      try {
        await onLoadMore(nextCursor);
      } finally {
        setInternalLoading(false);
      }
    }
  };

  return (
    <div className={cn("flex flex-col items-center justify-center py-6 w-full", className)}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleClick}
        disabled={loading || !nextCursor}
        className="min-w-[160px] h-10 px-6 font-medium text-xs sm:text-sm rounded-xl border-border bg-card/60 hover:bg-card text-foreground shadow-xs cursor-pointer"
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2 text-primary" />
            <span>{loadingLabel}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </Button>
    </div>
  );
}
