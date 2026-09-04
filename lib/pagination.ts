export interface PaginationState {
  cursor: string | null;
  hasMore: boolean;
}

/**
 * Extracts the cursor parameter safely from search parameters or URL.
 */
export function getCursorFromUrl(
  input?: string | URLSearchParams | Record<string, string | string[] | undefined> | null,
): string | null {
  if (!input) return null;

  if (input instanceof URLSearchParams) {
    return input.get("cursor");
  }

  if (typeof input === "string") {
    try {
      const url = input.startsWith("http") ? new URL(input) : new URL(input, "http://localhost");
      return url.searchParams.get("cursor");
    } catch {
      return null;
    }
  }

  if (typeof input === "object") {
    const raw = input.cursor;
    if (Array.isArray(raw)) {
      return raw[0] || null;
    }
    return typeof raw === "string" ? raw : null;
  }

  return null;
}

/**
 * Constructs a URL with an updated or cleared cursor query parameter.
 */
export function buildCursorUrl(
  pathname: string,
  searchParams?: URLSearchParams | string | null,
  nextCursor?: string | null,
): string {
  const params = new URLSearchParams(searchParams ? searchParams.toString() : "");

  if (nextCursor && nextCursor.trim().length > 0) {
    params.set("cursor", nextCursor);
  } else {
    params.delete("cursor");
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/**
 * Synchronizes the cursor query parameter into browser history without a full page reload.
 * Preserves browser back/forward navigation history according to Plan §4.4.
 */
export function syncCursorToUrl(
  nextCursor?: string | null,
  mode: "push" | "replace" = "push",
): void {
  if (typeof window === "undefined" || !window.history) {
    return;
  }

  try {
    const url = new URL(window.location.href);
    if (nextCursor && nextCursor.trim().length > 0) {
      url.searchParams.set("cursor", nextCursor);
    } else {
      url.searchParams.delete("cursor");
    }

    const stateObj = { ...window.history.state, cursor: nextCursor || null };
    if (mode === "push") {
      window.history.pushState(stateObj, "", url.toString());
    } else {
      window.history.replaceState(stateObj, "", url.toString());
    }

    // Notify listeners if any
    window.dispatchEvent(new PopStateEvent("popstate", { state: stateObj }));
  } catch {
    // Ignore history API errors
  }
}
