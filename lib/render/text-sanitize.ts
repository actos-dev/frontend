/**
 * Character-level cleanup shared by every entry point in this pipeline.
 * Mirrors markstone's `core/src/sanitize.rs` exactly (see
 * `is_invisible_or_bidi` / `strip_invisible_and_bidi` there) so a body looks
 * and behaves identically before and after the markstone swap.
 */

// U+200B..U+200D (zero-width space/non-joiner/joiner), U+FEFF (BOM / zero
// width no-break space), U+2060 (word joiner), U+00AD (soft hyphen),
// U+202A..U+202E (bidi embedding/override) and U+2066..U+2069 (bidi
// isolates). These are exactly the "Trojan Source" character classes.
const INVISIBLE_OR_BIDI = /[​-‍﻿⁠­‪-‮⁦-⁩]/g;

export function stripInvisibleAndBidi(input: string): string {
  return input.replace(INVISIBLE_OR_BIDI, "");
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
