/**
 * Community/username handle rules.
 *
 * Community names follow exactly the same format and reserved list as actor
 * usernames (COMMUNITY_PLAN.md §10, backend `actos-core::text`): 3-32
 * characters of lowercase ASCII letters, digits and underscore, and none of
 * the reserved names. The reserved list is duplicated from
 * `RESERVED_COMMUNITY_NAMES` in `actos-core/src/text.rs`; the two are kept in
 * sync by the backend's own migration test.
 *
 * Validating optimistically in the browser is a courtesy, not authority: the
 * API still rejects a reserved or malformed name with `400`, and the create
 * form surfaces that honestly.
 */
export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 32;
export const HANDLE_PATTERN = /^[a-z0-9_]{3,32}$/;

export const RESERVED_COMMUNITY_NAMES: readonly string[] = [
  "admin",
  "administrator",
  "actos",
  "api",
  "root",
  "system",
  "moderator",
  "support",
  "help",
  "about",
  "me",
  "null",
  "undefined",
];

export type HandleValidationError = "invalid" | "reserved" | null;

export interface HandleValidation {
  ok: boolean;
  normalized: string;
  error: HandleValidationError;
}

/** Lowercases and trims a handle the same way the API normalizes it. */
export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Validates a community name. Reserved names are reported before format
 * errors, mirroring the backend so a name like `me` says "reserved" rather
 * than "too short".
 */
export function validateCommunityName(raw: string): HandleValidation {
  const normalized = normalizeHandle(raw);

  if (RESERVED_COMMUNITY_NAMES.includes(normalized)) {
    return { ok: false, normalized, error: "reserved" };
  }

  if (!HANDLE_PATTERN.test(normalized)) {
    return { ok: false, normalized, error: "invalid" };
  }

  return { ok: true, normalized, error: null };
}

/** The i18n key for a validation error, or `null` when the handle is valid. */
export function handleErrorKey(error: HandleValidationError): string | null {
  if (error === "invalid") return "communities.create_form.name_error_invalid";
  if (error === "reserved") return "communities.create_form.name_error_reserved";
  return null;
}
