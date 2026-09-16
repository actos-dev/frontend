/**
 * Feature flags (ROADMAP.md §3 "Community slots built into Phases 1-6").
 *
 * Communities decisions (nav slot, post meta, composer target, etc.) are
 * implemented ahead of the Phase 7 communities API so nothing needs to be
 * rebuilt when it lands, but the UI stays hidden until then. Flip this one
 * constant to preview it locally; it is read from this single module so
 * turning it on for real is a one-line change.
 */
export const FEATURE_COMMUNITIES = false;
