/**
 * Drafts preservation module (Plan §8, Principle 2).
 *
 * Ensures user content (comments, new posts, drafts) is never lost when
 * an unauthenticated user attempts an action requiring login.
 * Content is preserved in sessionStorage and restored after login.
 */

const DRAFT_PREFIX = "actos_draft:";

export interface DraftEntry<T = string | Record<string, unknown>> {
  key: string;
  content: T;
  returnUrl?: string;
  savedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

/**
 * Persists a draft in sessionStorage.
 */
export function saveDraft<T = string | Record<string, unknown>>(
  key: string,
  content: T,
  returnUrl?: string,
): void {
  if (!isBrowser() || !key) return;

  try {
    const entry: DraftEntry<T> = {
      key,
      content,
      returnUrl,
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.warn("Failed to persist draft to sessionStorage:", error);
  }
}

/**
 * Retrieves a draft from sessionStorage without deleting it.
 */
export function getDraft<T = string>(key: string): T | null {
  if (!isBrowser() || !key) return null;

  try {
    const raw = window.sessionStorage.getItem(`${DRAFT_PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DraftEntry<T>;
    return parsed.content;
  } catch (error) {
    console.warn("Failed to retrieve draft from sessionStorage:", error);
    return null;
  }
}

/**
 * Retrieves the full draft entry including returnUrl and savedAt.
 */
export function getDraftEntry<T = string>(key: string): DraftEntry<T> | null {
  if (!isBrowser() || !key) return null;

  try {
    const raw = window.sessionStorage.getItem(`${DRAFT_PREFIX}${key}`);
    if (!raw) return null;

    return JSON.parse(raw) as DraftEntry<T>;
  } catch {
    return null;
  }
}

/**
 * Clears a specific draft from sessionStorage.
 */
export function clearDraft(key: string): void {
  if (!isBrowser() || !key) return;

  try {
    window.sessionStorage.removeItem(`${DRAFT_PREFIX}${key}`);
  } catch {
    // ignore
  }
}

/**
 * Generates an authenticated login redirect URL while safely preserving draft text.
 * Adheres to Principle 2: "Never lose what the user typed."
 */
export function createLoginRedirectUrl(
  returnUrl: string,
  draftKey?: string,
  draftContent?: string | Record<string, unknown>,
): string {
  if (draftKey && draftContent !== undefined) {
    saveDraft(draftKey, draftContent, returnUrl);
  }

  const searchParams = new URLSearchParams();
  searchParams.set("returnUrl", returnUrl);
  if (draftKey) {
    searchParams.set("draftKey", draftKey);
  }

  return `/login?${searchParams.toString()}`;
}
