"use client";

import { useRouter } from "next/navigation";
import { ErrorState, type ErrorStateProps } from "@/components/ui/error-state";

/**
 * Server-page variant of `ErrorState` that retries by re-running the current
 * route's server component (`router.refresh()`), instead of a client-side
 * refetch. Used wherever a server page fetch fails and renders the error
 * inline rather than substituting fabricated content (ROADMAP.md P0-02,
 * decision 7: "no production fallbacks, ever").
 */
export function ErrorStateRetry(props: Omit<ErrorStateProps, "onRetry">) {
  const router = useRouter();
  return <ErrorState {...props} onRetry={() => router.refresh()} />;
}
