/**
 * Feature flags (ROADMAP.md §3 "Community slots built into Phases 1-6").
 *
 * Communities decisions (nav slot, post meta, composer target, etc.) are
 * implemented ahead of the Phase 7 communities API so nothing needs to be
 * rebuilt when it lands. The default stays off; a build-time env override
 * turns it on for the real-backend e2e suite (playwright.real.config.ts sets
 * `NEXT_PUBLIC_FEATURE_COMMUNITIES=true` for its webServer). Because
 * `NEXT_PUBLIC_*` is inlined at build time, a production build must set the
 * variable before `next build`; it is never read at request time.
 *
 * Read from this single module by both server components and client
 * components, so disabling it stays a one-line change here.
 *
 * On by default since 2026-09-19: the communities API is live (backend
 * 0.3.0) and the read/create/post/cross-post/cover journey is verified
 * against the real backend (`test/e2e-real/communities.spec.ts`). Set
 * `NEXT_PUBLIC_FEATURE_COMMUNITIES=false` at build time to hide it.
 */
export const FEATURE_COMMUNITIES = process.env.NEXT_PUBLIC_FEATURE_COMMUNITIES !== "false";
