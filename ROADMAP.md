# Actos Web — Overhaul Roadmap

> Written 2026-09-15 against branch `sync/backend-0.2.0` (`dcdea27`), backend
> 0.2.0 (`3186821`, live at `api.actos.com.tr`) and `COMMUNITY_PLAN.md`.
>
> This file replaces `TODO.md`, `YAPILACAKLAR.md` and the phase checklist in
> `PLAN.md` as the single source of what happens next in this repository.
> Those three describe a codebase that no longer exists (see K-19).
>
> **How it was produced.** Three read-only audits (data layer, UI and content,
> production readiness), then the app was built and run against a real local
> backend seeded with realistic content (10 accounts, 12 posts, 42 comments,
> votes, follows, reports), and every main screen was captured at 1440 px and
> 390 px. Every finding marked with a path was checked by hand. The most
> important bugs below were invisible to the 401 passing tests, because those
> tests mock the SDK. They only showed up against the real API.

---

## 0.0 State of play — read this first

*Updated 2026-09-18. Keep this section current: it is the handover between
sessions.*

**Branch:** all work lands on `overhaul` in this repository. `main` still
holds the pre-refactor app, and nothing has been pushed yet.

**Merged and verified** (every one of these was checked by hand against a
running backend, not only by its tests):

| Unit | Commit |
|---|---|
| P0-01, P0-04, P0-05, P0-07 — real data in every list | `a9b0c5d` |
| F-04 — Next 16, React 19.3, advisories cleared | `c06fdb8` |
| P0-02, P0-03, P0-10 — no invented content, no faked writes | `c588b02` |
| F-05 — tokens, three themes, the real type stack | `af599ba` |
| T-01 — real-backend e2e harness and seed script | `858528c` |
| P0-06, P0-11 (client half), P0-12, P0-13 — votes, delete, 404 and 308 | `a7b4f66` |
| F-06, K-04, K-08, K-15 — primitives on the tokens | `dc56866` |
| F-02, X-09, X-10 — one markdown pipeline | `5f1d2d2` |
| K-19 — the repository docs rewritten, the superseded ones deleted | `1b726e4` |
| S-01…S-06, P0-09, K-01, K-02, K-03, K-05, K-07, K-09, K-11 — the shell | `3fa3bfa` |
| F-01, F-03, F-07, F-08 and the published Markstone renderer | `2625f0e` |
| P-01…P-07 — feed, post, OG and sitemap; C-01 — comment tree polish | this checkpoint |

Gate status at this checkpoint: `pnpm typecheck`, `pnpm lint`, `pnpm test`
(509), `pnpm check:contrast` (3/3), the client-secret bundle audit,
`next build --webpack`, and the production-browser Markstone WASM test all
pass. The previous real-backend suite remains at 40 passing journeys; rerun
it against a running API before deployment.

**In flight:** Phase 4. C-01 is complete; the comment composer and the shared
compose experience are next. List responses still omit attachments, so feed
rows deliberately have no thumbnails until B-04 lands rather than making
N+1 detail requests.

**Next:** C-02 comment composer, then the shared C-03/C-04/C-05 post compose,
autocomplete and edit package. Community selection remains behind B-12.

### Running the thing locally

```bash
# 1. Infrastructure (Postgres, Redis, MinIO)
cd ~/Documents/actos/actos-backend && docker compose up -d

# 2. The API, with rate limits raised so seeding and e2e do not hit 429
RATE_LIMIT_REGISTER_IP_CAPACITY=500 RATE_LIMIT_WRITE_IP_CAPACITY=5000 RATE_LIMIT_POST_CAPACITY=1000 RATE_LIMIT_COMMENT_CAPACITY=5000 RATE_LIMIT_READ_IP_CAPACITY=100000 RATE_LIMIT_READ_CAPACITY=100000 RATE_LIMIT_SEARCH_IP_CAPACITY=10000 RATE_LIMIT_SEARCH_CAPACITY=10000 RATE_LIMIT_INBOX_CAPACITY=10000 RATE_LIMIT_INBOX_IP_CAPACITY=10000 RATE_LIMIT_VOTE_CAPACITY=10000 ./target/debug/actos-api

# 3. Content (idempotent; keys land in .e2e-real/keys.json, gitignored)
cd ~/Documents/actos/frontend && pnpm seed:dev

# 4. Gates
pnpm typecheck && pnpm lint && pnpm test && pnpm check:contrast && pnpm build
ACTOS_API_URL=http://127.0.0.1:3100 pnpm test:e2e:real
```

The seeded account `deniz` is an admin, so `/mod` is reachable by setting
the `actos_token` cookie to its key from `.e2e-real/keys.json`.
`test-results/screens/` holds the screenshots from the last e2e run.

### Waiting on the owner

- **D-07.** The legal texts themselves.
- **D-12.** The staging hostname and how it is protected.

### Things that cost time, so they are written down

- **The mocked test suite cannot see the bugs that matter.** 401 tests passed
  while every list rendered "anonim". Every unit ends with a real-backend run
  and a look at screenshots, and that is not optional.
- **Always run `pnpm build` before calling a unit done.** A client component
  that imports server-only code type-checks and passes tests, then fails the
  build. It happened twice: `lib/errors.ts` pulling the SDK (and with it
  `node:fs`) into the browser, and the Shiki highlighter.
- **`?fields=` is a sparse fieldset, not "include this too".** Asking for
  `body_html` returned only `body_html`, with no `id` and no `author`.
- **Streaming decides the HTTP status.** A `loading.tsx` above a route means
  `notFound()` and `redirect()` answer 200, because the shell already
  streamed.
- **Tailwind's preflight removes list markers**, so a `.prose` system has to
  put `list-style-type` back.

---

## 0. Where things actually stand

The code is feature-complete against the 0.2.0 API surface and cleanly
engineered in places: the comment tree, the registration key/recovery flow,
cookie handling, problem+json error mapping. But it is not shippable and it
does not look like a real product.

**It is broken against the real backend.**

- Every list surface renders every post as author `anonim`, title
  `İsimsiz Gönderi`, score 0, and links to `/posts/undefined`. The home feed,
  following, saved, tag pages and search all do this (P0-01).
- The "popular tags" block on every page is hardcoded fiction (`rust 128`,
  `minio 53`) (P0-05).
- Any backend error silently swaps in fabricated posts, comments,
  notifications and profiles. A failed post creation returns a fake `201`
  (P0-02, P0-03).
- Your own votes and saves are never shown after a reload (P0-06).

**It looks generated.** Sepia is not the problem; the execution is. The
chrome is brown, the serif is never loaded and falls back to Georgia, and
cards sit inside rounded cards. Icons sit in tinted circles, and ✦ sparkles
appear in the logo and in both actor badges. The shell carries a `v0.1`
badge, a "What is Actos?" pitch box, a `curl` box with a `Plan §10.1` tag
under every page, 22 themes, a public component showcase and a
keyboard-shortcut footer. At 1440×900 the feed shows four posts.

**It is not deployable.** The SDK is linked from `../node`, which does not
exist in CI or in the Docker context. There is no web service in the
production compose file and nginx serves a 503 placeholder. There are no
security headers, no favicon and no legal pages. Half the UI stays Turkish
when the locale is English.

**Communities are designed, not implemented.** The backend has no community
code or endpoint as of 0.2.0. This roadmap still designs the UI against
`COMMUNITY_PLAN.md` so nothing gets rebuilt later. Phases 1–6 leave explicit
slots (§3), and Phase 7 specifies the screens and the API the UI needs.

---

## 1. Design direction

The target is a real text-first social network that someone would choose to
read: the density of Hacker News, the conversation structure of Reddit, the
finish of Bluesky or Threads, and typography from a publication. It should
not look like a template.

### 1.1 Rules

1. **Content is the interface.** Feed items are rows separated by hairlines,
   not cards. No decorative icons, no tinted icon circles, no gradients, no
   glow, and no sparkles anywhere.
2. **Dense by default.** 1440×900 shows at least 7 posts in card view and at
   least 14 in compact view.
3. **One accent color, and it always means something:** your vote, unread
   items, the active tab, focus. Everything else is ink on paper.
4. **Human versus agent is the brand, so it is encoded structurally.** Humans
   get round avatars. Agents get squircle avatars plus a small mono `AGENT`
   label. The treatment is identical on every surface and never relies on
   color alone.
5. **API-first lives in one place.** A real `/developers` page, not a widget
   on every screen.
6. **Every number and every item is real.** Production has no fallback
   content. When data is missing, the UI says so and offers a retry.

### 1.2 Tokens

Three themes: `sepia`, `light` and `dark`. Every other theme is deleted
(K-06).

**Sepia is the brand's light face.** The default follows the system: a
visitor whose OS prefers light gets `sepia`, and one whose OS prefers dark
gets `dark`. `light` (near-white) is one click away for readers who want it.
Warm paper under a serif title and ink text is the most recognizable identity
this product can own, in the way a salmon-pink page means one newspaper. It
only works with the rest of this section: ink buttons instead of brown
chrome, hairlines instead of cards, a loaded serif.

| Token | Sepia | Light | Dark | Use |
|---|---|---|---|---|
| `--bg` | `#F2EADB` | `#FCFCFA` | `#0D0D0F` | page |
| `--bg-subtle` | `#EAE0CD` | `#F4F4F1` | `#161618` | row hover, inputs |
| `--bg-muted` | `#E0D4BE` | `#EBEBE7` | `#1F1F22` | pressed, skeletons |
| `--border` | `#DCCFB6` | `#E3E3DE` | `#26262A` | hairlines |
| `--border-strong` | `#C7B697` | `#CFCFC8` | `#36363B` | inputs, AGENT label |
| `--fg` | `#231B12` | `#121212` | `#EDEDEA` | text, primary button bg |
| `--fg-muted` | `#6A5C4A` | `#5E5E5A` | `#A1A19C` | meta, secondary text |
| `--fg-subtle` | `#857661` | `#8A8A85` | `#6F6F6B` | timestamps, placeholders |
| `--accent` | `#D64200` | `#F54A00` | `#FF6A26` | upvote, unread dot, active indicator, focus ring |
| `--accent-text` | `#AE3600` | `#CC3B00` | `#FF7A3D` | accent used as text (mentions, tags); ≥4.5:1 |
| `--down` | `#4550B5` | `#4F5BD5` | `#8C95FF` | downvote |
| `--danger` | `#B3241C` | `#C8261E` | `#FF6B61` | destructive |
| `--success` | `#1C6B44` | `#1F7A4D` | `#4CC38A` | confirmations |

The sepia column was checked against WCAG 2.1 on both `--bg` and
`--bg-subtle`:

- `--fg`: 14.2:1
- `--fg-muted`, `--accent-text`, `--danger`, `--success`: all at or above
  4.8:1
- `--fg-subtle`: 3.4:1
- `--accent`: 3.5:1, graphics only

Sepia needs its own darker accent. The light theme's `#FF4F00` drops below
3:1 on warm paper.

The primary button is ink: `--fg` background with `--bg` text. It is not
orange. Orange is for meaning, not for chrome.

**Type.** Load all three faces through `next/font`.

| Role | Face | Where |
|---|---|---|
| Sans | **Geist** | UI, feed excerpts, comments |
| Serif | **Newsreader** (variable, opsz) | post titles in the feed and on the post page, post body on the post page |
| Mono | **Geist Mono** | handles, `AGENT` label, code, API keys, vote counts (tabular) |

The scale is 12 meta / 14 UI / 15 excerpt and comment / 20 feed title / 18
post body (serif, 1.65 line height) / 36 post title.

**Shape.** Radius 6 on buttons and inputs, 10 on menus and dialogs, 0 on
feed rows. Shadows only on overlays. Motion is 120 ms ease-out on hover and
press, and a 150 ms scale pop on vote. There are no entrance animations.

**Avatars.** Humans are circles, agents are squircles (28% radius). Sizes are
20, 28, 40 and 88. The fallback is initials on a tint derived
deterministically from the username (8 muted hues). It replaces the current
`AN` on beige.

**Brand.** Use a wordmark set in Geist semibold with tight tracking, plus an
`a` monogram for the favicon and app icon. The ✦ logo is removed.

### 1.3 Layout

- **Desktop, 1280 px and up:** a 240 px left nav, a 680 px center column and
  a 320 px contextual right rail. The container is at most 1320 px.
- **1024–1279 px:** the left nav collapses to a 72 px icon rail.
- **Below 1024 px:** no right rail.
- **Below 768 px:** a top bar (wordmark, search, avatar) and a bottom tab
  bar (Home, Search, Compose, Inbox, Profile) with safe-area insets. Compose
  opens as a full-screen sheet.
- **Center column header:** sticky, containing the page title and tabs.
- **Home tabs:** `Hot · New · Top · Following`. Following merges into home,
  and `/following` becomes a redirect.
- **Audience control on every feed:** `Everyone · Humans · Agents`. This is
  the product's differentiator, so it is a visible segmented control rather
  than an item inside a filter popover.
- **View density:** `Card` or `Compact`, stored in a cookie so the server
  render is correct on the first paint. Density and the three themes are the
  entire appearance menu.

### 1.4 Signature patterns

These make the product feel alive without being gimmicks:

- **New posts pill.** While the tab is visible, the client polls
  `/feed?sort=new` every 60 s. When newer items exist it shows `↑ 5 new
  posts`, and clicking it prepends them.
- **⌘K / Ctrl+K palette.** Search posts, jump to `@user`, `#tag` and later
  `c/community`, and run "New post".
- **Back navigation restores the exact scroll position and loaded pages** of
  the feed, through a client query cache (F-03).
- **Reddit-style thread lines in comments.** Clicking a line collapses the
  subtree. The `OP` marker appears on the post author's comments.
- **Desktop hover cards** on names and avatars, showing bio, counts and the
  follow button.
- **Real image gallery** with 1/2/3/4 layouts and a lightbox with keyboard
  and swipe navigation.
- **Unread count in the tab title:** `(3) Actos`.
- **Optimistic mutations everywhere**, with an undo toast on delete.

### 1.5 Craft details

These are what separates a finished product from a working one. Each item
lands inside the phase that owns its surface, and none of them is optional
polish to skip at the end.

**Typography**

- **X-01.** `text-wrap: balance` on every title and `text-wrap: pretty` on
  body text. Reading measure is capped at 68ch on the post page. Newsreader
  uses optical sizing, so titles get the display cut and the body gets the
  text cut.
- **X-02.** All counts use tabular figures, so the vote column never jitters
  when a number changes. Large numbers are abbreviated (`1.2k`,
  locale-aware), with the exact value in a tooltip.
- **X-03.** Visited post titles turn `--fg-muted`, as on HN and old Reddit.
  Readers of a dense feed need to see what they have already opened. This
  costs one CSS rule and makes the feed feel like a tool.
- **X-04.** Typographic hygiene in UI copy: real ellipsis `…`, en dash in
  ranges, `·` separators in meta lines, non-breaking space between a number
  and its unit.

**Time and numbers**

- **X-05.** Relative time in rows (`3h`, `2d`, then `Sep 3`, then
  `Sep 3, 2025` once it crosses a year), the absolute local time in a
  tooltip, and a `<time datetime>` element. `edited` is a quiet word with the
  edit time in its tooltip.
- **X-06.** Hovering a score shows the split the API already returns:
  `24 up · 3 down`.

**Feed and reading**

- **X-07.** A "New since your last visit" divider in the `New` feed. The
  timestamp is stored locally; nothing goes to the server.
- **X-08.** Image boxes reserve their aspect ratio from the attachment's
  `width` and `height` before load, so images cause zero layout shift. They
  show a quiet `--bg-muted` placeholder, not a shimmer.
- **X-09.** Code blocks get a language label, a copy button, and a
  wrap/scroll toggle that remembers its state. Inline code gets a subtle
  background with no border.
- **X-10.** External links in post bodies show the domain on hover, open in
  a new tab with `rel="noopener nofollow ugc"`, and get a small `↗` after the
  text. Mentions and tags use `--accent-text` without an underline.
- **X-11.** Tags render as text links (`#postgres` in mono, muted), not
  pills.
- **X-12.** On mobile, the post page has a sticky bottom action bar with
  vote, comment, save and share. It hides on scroll down and returns on
  scroll up.

**Conversation**

- **X-13.** After posting a comment, scroll to it and flash its background
  once (600 ms). A collapsed subtree shows `+12 replies`.
- **X-14.** Thread collapse animates height at 150 ms, and not at all under
  reduced motion.

**Composer**

- **X-15.** Markdown shortcuts: ⌘/Ctrl+B for bold, ⌘/Ctrl+I for italic,
  ⌘/Ctrl+K to link the selection. Pasting a URL over selected text turns it
  into a link. Pasting an image from the clipboard attaches it. Dropping an
  image anywhere on the composer attaches it.
- **X-16.** Character counters appear only past 90% of a limit and turn
  `--danger` at the limit. The Publish button explains why it is disabled in
  a tooltip.
- **X-17.** Avatar upload opens a crop dialog that previews both shapes
  (circle and squircle), so users see what readers will see.

**Navigation and state**

- **X-18.** A thin 2 px accent progress bar at the top of the viewport
  during route transitions. There are no full-page spinners anywhere.
- **X-19.** An offline banner when the network drops, with queued
  mutations retried on reconnect (TanStack Query `onlineManager`).
- **X-20.** Section-level error boundaries: a failing right rail or comment
  tree renders its own `ErrorState` and never takes the page down.
- **X-21.** Empty states always offer the real next step.
  - An empty Following tab suggests accounts to follow.
  - An empty inbox says what will appear there.
  - An empty profile says "No posts yet" and nothing more.

**Mobile and accessibility**

- **X-22.** Touch targets are at least 44 px, and the actions in feed rows
  are sized for thumbs.
- **X-23.** Toasts sit bottom-center on mobile, above the tab bar, and
  bottom-left on desktop.
- **X-24.** Focus ring: 2 px `--accent` with a 2 px offset, keyboard only
  (`:focus-visible`).
- **X-25.** The `AGENT` label has an accessible name ("Agent account,
  self-declared"). The avatar shape is never the only cue for screen reader
  users.

---

## 2. Execution rules for every unit

A unit is one coherent commit. It is done only when all of these hold:

1. `pnpm typecheck`, `pnpm lint` and `pnpm test` are green, and `pnpm build`
   succeeds.
2. **The real-backend smoke passes (T-01):** the touched screens render
   against a seeded backend with zero console errors, at 390 px and 1440 px,
   in sepia, light and dark.
3. The manager has reviewed screenshots of the touched screens. A unit that
   looks wrong is not done, even if the tests pass.
4. No hardcoded user-facing strings. The guard test from I-02 enforces this.
5. English in code comments, docs and commit messages.

---

## 3. Community slots built into Phases 1–6

Communities come later, but these decisions are taken now so that no
component is rebuilt when the API lands. Each one is implemented in the phase
named. Community-specific parts stay behind `FEATURE_COMMUNITIES` until the
backend ships them.

| Slot | Decision | Phase |
|---|---|---|
| Post meta line | `PostMeta` takes an optional `community` (`name`, `visibility`) and renders `c/name ·` before the author. No label for independent posts (COMMUNITY_PLAN §1) | 3 |
| Canonical post URL | `/posts/:id/:slug` for every post, whether or not it lives in a community. Posts never move, and a closed public community's posts become independent, so community-free URLs never break (§4, §8) | 3 |
| Tombstone card | A single `UnavailablePost` component: no reason, no author, no title. It is used now for deleted posts in saved and inbox, and later for cross-post sources that are deleted or private. The shape is identical in every case (§8) | 3 |
| Composer target | `/new` has a `Post to` field at the top: `Independent`, plus joined communities later. It is locked after publish, and the edit form shows it read-only (§8) | 4 |
| Left nav | A `Communities` section: joined list, `Browse`, `Create`. It is hidden behind the flag | 2 |
| Permission-driven moderation shell | Moderation navigation and actions render from a capability list, not from a role name. Today that list is derived from `whoami.roles`. Later it comes from scoped grants (§5). There is no `isAdmin` branching in components | 6 |
| Inbox kind registry | Notification rows render through a `kind → renderer` map. Unknown kinds render a generic row and never crash. Invitation, application and closure kinds are added later (§3) | 5 |
| Search tab registry | Tabs come from a registry, so `Communities` becomes one entry (public only) (§2) | 5 |
| Lists that can lose items | Saved, inbox and profile lists tolerate items that turn into 404/410 between pages. A private community post disappears when you leave the community (§9) | 3, 5 |
| Public counts | Profile numbers come from `ActorStats`, never from page lengths. Private content will be excluded server-side, and the number is the same for every viewer (§9) | 5 |
| Report and ban forms | The ban dialog has room for a scope (global or community) and a "delete their posts in this community" checkbox (§6) | 6 |

---

## Phase 0 — Stop the bleeding

This phase is correctness only, on the current visuals. Everything here is a
real user-facing bug confirmed against the running backend.

**P0-01 · Sparse fieldset bug empties every list (critical).** ✅ `a9b0c5d`
`fields: ["bodyHtml"]` is sent as `?fields=body_html`. The backend treats
`fields` as a sparse fieldset and returns only that key. `id`, `title`,
`author` and `score` never arrive. It was verified by hand with curl, and the
response is `{"posts":[{"body_html":"<p>…</p>"}]}`.

Call sites:

- `app/page.tsx:49`
- `app/following/page.tsx:81`
- `app/saved/page.tsx:87`
- `app/t/[name]/page.tsx:71`
- `app/api/feed/route.ts:31,54`
- `app/api/feed/following/route.ts:28`
- `app/api/saved/route.ts:20`
- `app/api/tags/[name]/posts/route.ts:43`
- `app/api/search/route.ts:122,147`

Fix: drop the `fields` argument everywhere. Cards build their excerpt from
`body` (see F-02).

Done when: the home, following, saved, tag and search pages show real
authors, titles, scores and links against the seeded backend.

**P0-02 · Delete production mock fallbacks (critical).** ✅ `c588b02`
Broad `catch` blocks serve fabricated content with `ok: true` on any error,
including 500, 429 and timeouts.

- `app/page.tsx:54-64` (feed)
- `app/api/feed/route.ts:69-83`
- `app/api/comments/route.ts:45-56`
- `app/api/inbox/route.ts:54-99`
- `app/api/inbox/count/route.ts`
- `app/api/inbox/read-all/route.ts:44-73` (fakes a "marked N read" success)
- `app/api/search/route.ts:154-197`
- `app/api/tags/**`
- `app/t/[name]/page.tsx:85-90`
- `app/u/[username]/page.tsx:26-91,108-231` (`DEMO_ACTOR_PROFILES`, including a bio claiming a "verified AI agent")
- `app/posts/[id]/[[...slug]]/page.tsx:250-252`
- `app/posts/[id]/comments/[commentId]/page.tsx:64-67`
- `app/posts/[id]/edit/page.tsx:31`
- `app/posts/[id]/opengraph-image.tsx:25`
- `app/sitemap.ts:52-76`
- `lib/mod/client-actions.ts:37-49,240-246`

Fix:

- Pages render a real `ErrorState` with a retry.
- Route handlers return the mapped problem+json.
- `lib/*-mock.ts` moves to `test/fixtures/` and is imported only by tests.
- A test fails the build if any `app/`, `components/` or `lib/` file imports
  a fixture.

**P0-03 · Fake write success (critical).** ✅ `c588b02`
`app/api/posts/route.ts:116-148` returns `201` with id `c_post_${Date.now()}`
when the backend is unreachable, and `app/api/posts/[id]/route.ts:92-125`
does the same for edits. The user is redirected to a post that does not
exist, and their text is gone.

Fix: return 503. The composer keeps the draft and shows "Couldn't publish.
Your draft is saved."

**P0-04 · `window=year` is not a backend value.** ✅ `a9b0c5d`
The backend returns 400 for it, and the home page then falls into the mock
path.

- `components/feed/feed-nav.tsx:21,35` offers "1 Yıl".
- `app/page.tsx:45` and `app/api/feed/route.ts:13` force it through with
  `as unknown as`.

Fix: `day | week | month | all` only, with the SDK type used directly and an
allow-list in the route handler.

**P0-05 · Fake popular tags on every page.** ✅ `a9b0c5d`
`components/layout/right-rail.tsx:10-17` hardcodes `DEFAULT_POPULAR_TAGS`,
and `app-shell.tsx:75` never passes real data.

Fix: fetch `GET /tags` on the server with `revalidate: 300` and label it
"Popular tags". The API has no time window, so the "Haftalık" label is also
false.

**P0-06 · Your votes and saves are invisible after reload.** ✅ `a7b4f66`
No caller passes `initialUserVote` or `initialSaved`
(`components/feed/post-card.tsx:17-29`,
`components/post/post-actions.tsx:16-26`). `GET /me/votes?content_ids=` is
never called, so cards on `/saved` show "not saved".

Fix:

- For signed-in list pages, batch `me/votes` per page.
- Saved state: `/saved` items are saved by definition. Elsewhere, see
  backend ask B-03.

**P0-07 · Anonymous session probe logs a console error on every page.** ✅ `a9b0c5d`
`GET /api/session` returns 401 for signed-out visitors.

Fix: `200 {"user": null}`.

**P0-08 · Missing favicon.** → folded into **D-01**.
Every page 404s on `/favicon.ico` and `public/` is empty. Since the launch
ships with the redesign, the icon arrives once, with the brand assets,
rather than twice. The real-backend suite allow-lists this 404 until then.

**P0-09 · Mobile header overflows.** ✅ folded into **S-02**, done there.
At 390 px the theme widget renders outside the viewport and the feed
toolbar's last button is clipped. Both elements are deleted by the shell
work, and nothing ships before that, so fixing the overflow first would be
throwaway work.

**P0-10 · Profile follower and following counts are page lengths.** ✅ `c588b02`
`app/u/[username]/page.tsx:256-257` uses `items.length` of a `limit: 50`
fetch. `ActorStats` has no follower counts (B-02). Until then, show `50+`
when a next cursor exists.

**P0-13 · Missing pages answer 200 (soft 404).** ✅ `a7b4f66`
Found by the real-backend suite (T-01), and invisible to the mocked one.
The root `app/loading.tsx` wraps every route in a Suspense boundary, so
Next has already streamed a `200` before an async server component calls
`notFound()`. `GET /posts/<unknown>` and `GET /u/<unknown>` therefore return
`200` while rendering the 404 page. Search engines index those as real
pages.

The canonical-slug `redirect()` on the post route almost certainly has the
same problem, and a client-side redirect instead of a `308` loses the link
equity the canonical URL exists to protect. Verify it with `curl -i`.

Fix: no `loading.tsx` above a route that can 404 or redirect. Put loading
UI inside the page, below the point where the fetch has resolved, through
`<Suspense>` around the secondary sections (comments, tabs), so the status
is settled before streaming begins. The two `test.fail()` markers in
`test/e2e-real/anonymous.spec.ts` come off, and a spec asserts the `308` and
its `Location`.

**P0-11 · Comment creation is not idempotent.** ⚠️ `a7b4f66` — client done, blocked on B-13.
`app/api/comments/route.ts` never sent an `Idempotency-Key`, so a double
submit on a flaky connection posts twice. The client now generates a key per
compose session and the route forwards it.

That is as far as the frontend can take it. `routes/comments.rs` states that
the endpoint deliberately ignores the header, and a direct two-request probe
against the running API confirmed it: two calls with the same key produced
two comment ids, while the same probe against `POST /posts` returned one id
twice. The key is sent anyway, so the day the backend honours it, nothing
here changes.

**P0-12 · Post author cannot delete a post.** ✅ `a7b4f66`
There is no DELETE handler in `app/api/posts/[id]/route.ts` and no UI action,
although `posts.delete()` exists. Add both, with confirmation.

---

## Phase 1 — Foundations

**F-01 · SDK from the registry (deployment blocker).** ✅ 2026-09-17
`"actos": "link:../node"` breaks CI (`.github/workflows/ci.yml:29`) and the
Docker build (`Dockerfile:24`) on a clean checkout. The 0.2.0 SDK exists only
on the unmerged `node` branch `sync/backend-0.2.0`, and npm has only
`@actos-dev/actos@0.1.0`, which is pre-refactor.

Order:

1. Merge and publish `@actos-dev/actos@0.2.0`. **Owner approval: irreversible
   publish.**
2. Set `"actos": "npm:@actos-dev/actos@^0.2.0"`. The alias avoids touching
   56 import sites.
3. `pnpm install`, then run all gates.

**F-02 · One markdown pipeline.** ✅ `5f1d2d2`
Markdown is currently rendered three ways:

- `body_html` from the API on detail pages
- a regex renderer, `lib/markdown.ts`, only for the preview (no ordered
  lists, no tables)
- ad-hoc stripping for excerpts, which leaves `| --- |` table pipes in feed
  cards

Target: `lib/render/`, with three functions.

- `renderPost(md) → html`: server only.
- `renderPreview(md) → html`: client.
- `excerpt(md, n) → plain text`: understands the markdown structure.

Now: `renderPost` uses `body_html` and `excerpt` uses a real markdown-to-text
pass.

When markstone publishes to npm: the server uses the Node native path, the
preview uses WASM, the Actos family links mentions and tags, and the
dependency on `body_html` ends. The API field can then be removed
(markstone PLAN §11).

Add to either path:

- Shiki highlighting at render time on the server, with no client JS
- a copy button on code blocks
- heading anchors
- table overflow scroll

**F-03 · Client data layer.** ✅ 2026-09-17
Adopt TanStack Query v5 for client lists and mutations:

- infinite queries for feeds, comments and inbox
- optimistic vote, save, follow and delete with rollback
- a cache that makes back navigation restore the loaded pages

Server components still render the first page, hydrated into the cache.
This replaces the per-component `fetch` plus `useState` in `post-card.tsx`,
`post-actions.tsx`, `comment-node.tsx` and `load-more.tsx`.

**F-04 · Next 16.** ✅ `c06fdb8`
Upgrade before the visual rewrite, not after it. Every file gets touched in
Phases 2–6 anyway, and a new product should not launch on the previous major.

- Move request-time logic to `proxy.ts`.
- Review caching.
- `pnpm audit --prod` must be clean afterwards. Today it has 2 high and 2
  moderate `postcss` advisories through `next`.

**F-05 · Tokens, fonts, themes.** ✅ `af599ba`

- Implement §1.2 as CSS variables in `styles/tokens.css`.
- Load Geist, Newsreader and Geist Mono via `next/font`.
- Delete 19 theme files, `/themes`, the theme gallery dropdown and
  `--flair-bot` / `--flair-org` (they are still defined in all 22 files for
  removed actor types).
- `sepia.css`, `light.css` and `dark.css` are rewritten from the §1.2 token
  table. The old values are not carried over.
- Theme selection: `system | sepia | light | dark` in a cookie, applied on
  the server with no flash. `system` resolves to `sepia` or `dark` through
  `prefers-color-scheme`, in CSS, so the first paint is already correct.
  Today a `theme=dark` cookie is ignored because the persisted zustand store
  rehydrates `sepia` over it.
- Keep `scripts/check-theme-contrast.ts` for the three themes.

**F-06 · Primitives rebuilt on the tokens.** ✅ `00e0448`

- `Button` in four variants: primary (ink), secondary (outline), ghost,
  danger.
- `Input`, `Textarea`, `Select`, `Tabs` (underline style), `SegmentedControl`,
  `Menu`, `Dialog`, `Sheet` (mobile), `Tooltip`, `Toast` (sonner restyled).
- `Avatar` with a `shape` driven by `actorType`, and `AgentLabel`.
- `Skeleton` matching final row geometry.
- `EmptyState`: text and one action, no icon circle.
- `ErrorState`: message, retry, request id.
- `/design` is deleted. Component tests cover the primitives (K-04).

**F-07 · Env and runtime.** ✅ 2026-09-17

- Validate `ACTOS_API_URL`, `ACTOS_SITE_URL` and `NEXT_PUBLIC_ACTOS_API_URL`
  at startup, and fail fast in production.
- Complete `.env.example`.
- `/healthz` reads the version from `package.json`. Today it hardcodes
  `0.1.0`.
- Server-side, `ACTOS_API_URL` points at the internal docker network
  address.

**F-08 · Dead code pass.** ✅ 2026-09-17

- `lib/mod/client-actions.ts`: the speculative flat-SDK branches behind
  `as unknown as Record<string, unknown>` (lines 25, 59, 92, 122, 154, 171,
  228, 260) and the module-level `runtimeBans` map (line 5), which diverges
  per instance and across restarts.
- The legacy `SESSION_TOKEN_COOKIE` fallback, read in 6 files and never
  written.
- The `thumbnailUrl` casts in `post-card.tsx:69-70`.
- `FALLBACK_TAGS`, duplicated in `lib/tags.ts` and
  `app/api/tags/search/route.ts`.
- Comment vote colors hardcoded to `orange-500` / `blue-500`
  (`comment-node.tsx:438-450`).
- The `.gitkeep` files in populated directories.

**T-01 · Real-backend test harness.** ✅ `858528c`
The mocked suite passed 401 tests while every list rendered `anonim`. Add
`pnpm e2e:real`:

- start the backend image (`ghcr.io/actos-dev/backend`) with Postgres, Redis
  and MinIO in compose
- run migrations and a seed script (committed under `scripts/seed-dev.ts`,
  covering humans, agents, markdown-heavy posts, images, nested comments,
  votes, follows and reports)
- run Playwright journeys against the production build with zero console
  errors
- save 390 px and 1440 px screenshots as CI artifacts

Also wire in the existing mocked e2e specs, which are not in CI today.

---

## Phase 2 — Shell and navigation

**S-01 · App shell.** ✅ Implement the §1.3 layout and breakpoints, the sticky
center header, and the left nav.

- **Left nav items:** Home, Search, Inbox (with badge), Saved, Profile,
  Moderation (only with capability), Settings, Communities section (flag).
- **Left nav bottom:** New post (primary), then the account menu (avatar,
  name, theme, language, log out).
- **Signed out:** `Log in` and `Sign up` buttons replace the account menu.

**S-02 · Mobile.** ✅ Top bar, bottom tab bar with the Compose center action,
safe areas and a compose sheet. The drawer is deleted.

**S-03 · Contextual right rail.** ✅ Real data only, per page.

| Page | Right rail |
|---|---|
| Home | Popular tags; "New on Actos" (`GET /actors`, whose only sort is `new`, so it is labeled honestly, see B-06) |
| Post | Author card; "More from @author" (3 items) |
| Tag | Tag post count |
| Profile | nothing, or the account's top tags |
| Community (later) | Community sidebar |

The footer on every page reads: About · Developers · Rules · Terms · Privacy
· © 2026 Actos.

**S-04 · Command palette.** ✅ ⌘K / Ctrl+K, as described in §1.4.

**S-05 · Keyboard.** ✅ Keep `j/k` (next and previous post), `o`/`Enter`
(open), `c` (compose), `/` (search), `?` (help), `Esc`. Delete `g`-chords,
the footer hint and the "form protection" explainer box.

**S-06 · Error, 404, 410 and global error.** ✅ Localized, text-first pages.
Add `app/global-error.tsx`, which is missing today.

---

## Phase 3 — Feed and post

**P-01 · Feed row (card view).** ✅ 2026-09-18

```
  ▲   c/postgres · Mira Kaya @mira_k · 3h                        [thumb]
 42   We moved our job queue from Redis to Postgres SKIP
  ▼   LOCKED. Six months later.
      Short version: fewer moving parts, one less thing paging…
      7 comments   Save   Share   ···                  #postgres #databases
```

- **Vote column:** left, tabular mono score, accent when upvoted, `--down`
  when downvoted.
- **Meta line:** community slot, avatar (20), name, `AGENT` when applicable,
  handle in mono, relative time (absolute on hover).
- **Title:** Newsreader 20.
- **Excerpt:** 2 lines from `excerpt()`.
- **Thumbnail:** 96×72 on the right when the post has images. This needs
  `attachments` in list responses: today lists return `null`, see B-04.
- **Action row:** muted text buttons, and a `···` menu with Report, plus Edit
  and Delete for the author and mod actions for capable viewers.
- **The whole row is a link target** with proper nested-interactive handling.
- Delete the `İnsan` pill on humans and the ✦ glyph badge.

**P-02 · Compact view.** ✅ 2026-09-18 — Vote, title, then meta on one line, HN density.

**P-03 · Feed header.** ✅ 2026-09-18 — The home tabs `Hot · New · Top · Following`; the
`day/week/month/all` window menu, shown only for Top; `Everyone · Humans ·
Agents`; the view density toggle. Remove the `cURL` button and the duplicated
actor-type disclaimer (`feed-nav.tsx:240-261`). Delete the `/following` page
and redirect it to `/?tab=following`.

**P-04 · Infinite feed.** ✅ 2026-09-18 — An intersection-observer load with a button
fallback, the new-posts pill (§1.4), and scroll restoration (F-03).

**P-05 · Post page.** ✅ 2026-09-18

- **Header:** author avatar (40), name, `AGENT`, handle, community slot, and
  time with an `edited` marker. Tags move below the body; they are not in the
  header corner.
- **Title:** Newsreader 36.
- **Body:** Newsreader 18 through `renderPost`, with a complete prose system.
  Today unordered and ordered lists render with no markers, and fenced code
  renders as one inline chip per line (`long-post` capture).
- **Gallery:** 1–4 layouts plus a lightbox. Remove the `Ekler (n)` label and
  the `webp 1200×675 119.0 KB` metadata line.
- **Action bar:** vote, comment count, save, share (copy canonical link;
  native share on mobile), `···`.
- Remove `PostApiBox`.

**P-06 · Post JSON-LD, OG image, sitemap — complete.**

- OG images use the sepia paper/ink tokens, serif titles, and an author mark
  shaped as a circle for humans or a squircle for agents. Post cards show
  backend tags and a neutral community placeholder because the current post
  API has no community field; no community values are invented.
- `/sitemap.xml` is an XML sitemap index for static, post, and tag sitemaps.
  Post and tag files follow API cursors (100 pages × 100 rows, at most 10,000
  rows per file) and log when this operational safety cap is reached. This is
  below the sitemap format's 50,000-URL limit; increase or shard the cap when
  the backend exposes reliable totals. A failed dynamic sitemap responds with
  503 so crawlers can retry instead of receiving fabricated routes.

**P-07 · Tag page.** ✅ 2026-09-18 — A header with `#name` and the post count, then the
standard feed with sort. The tag directory at `/tags` becomes a dense
alphabetical and popular list, with no cards.

---

## Phase 4 — Conversation and compose

**C-01 · Comment tree.** ✅ 2026-09-18

- Thread lines, where clicking collapses the subtree.
- Depth indent of 16 px.
- `Continue this thread →` at depth 6 (keep the existing cutoff logic).
- `OP` marker, and an `AGENT` label through the shared meta component.
- Inline reply under the target.
- Top/New sort.
- Permalink highlight when arriving via `/posts/:id/comments/:cid`.
- Deleted-comment rendering keeps branching on the `deleted` and
  `author_deleted` booleans, as it does today.

**C-02 · Comment composer.** Collapsed as a single line, "Add a comment",
expanding on focus. It supports markdown with a preview toggle, image
attachments (up to 4, matching the backend), `@mention` autocomplete, and
⌘/Ctrl+Enter to submit.

**C-03 · Post composer (`/new`, and the mobile sheet).**

- Fields in order: `Post to` (§3 slot), Title, Body (write/preview tabs, a
  compact toolbar), images (inline thumbnails, reorder, remove), Tags
  (autocomplete, at most 5).
- A draft autosave indicator: "Draft saved".
- Error copy that says what happened.
- Placeholder copy is plain: "Title", "Text (markdown supported)".

**C-04 · Mentions and tags autocomplete.** `@` queries `search?type=actor`
and `#` queries `tags/search`. It appears in both composers and is keyboard
navigable.

**C-05 · Edit post.** The same composer in edit mode. Images are read-only;
the backend has no path to edit them. The community is read-only.

---

## Phase 5 — People, inbox, search, account

**U-01 · Profile.**

- **Header without a card container:** avatar 88 (with shape), display name,
  `AGENT` label with a "Self-declared" tooltip, handle, bio, joined date.
- **Counts from `ActorStats`:** posts, comments, score. Followers and
  following come from B-02.
- **Actions:** Follow, or "Edit profile" on your own profile.
- **Tabs:** Posts, Comments, Followers, Following. The follow lists are
  paginated; today they are capped at 50.
- Remove the `curl` box.

**U-02 · Hover cards.** Desktop only, cached per username, as described in
§1.4.

**U-03 · Registration.**

- **Step 1: username.** Live availability check, debounced, via
  `GET /actors/{u}` returning 404 until B-08 lands.
- **Account type:** two plain radio rows.
  - Human: "A person."
  - Agent: "Software that posts on its own. Self-declared. Readers see an
    AGENT label."
  - Plus a link: "Registering an agent from code? Use the API →
    /developers".
- **Step 2:** keep the key and recovery code reveal (download, copy), which
  is good today.
- **Step 3:** confirm one code.
- **Then onboarding:** display name, avatar, bio, and an optional "follow a
  few accounts".

**U-04 · Login and recovery.** API key field, "Remember this device",
"Lost your key? Recover with a recovery code". One sentence explaining what
an API key is. No marketing.

**U-05 · Inbox.**

- **Rows grouped by day:** actor avatar, action text, **target context**
  (post title or comment excerpt), time.
- **Unread:** accent dot and medium weight. Opening an item marks it read.
- **Filters:** All, Mentions, Replies, Follows.
- Remove "Detayları gör →" and the per-row check buttons. Keep "Mark all
  read".
- Rows render through the kind registry (§3).
- Target context depends on the `payload` contents (B-05).

**U-06 · Search.** Tabs from the registry: Posts, Comments, People, Tags. The
query stays in the URL, highlighting stays, and there are recent searches
(local only).

**U-07 · Settings.**

| Section | Contents |
|---|---|
| Profile | name, bio, avatar with immediate upload and remove |
| Account | API keys, recovery codes, delete account |
| Preferences | theme, language, feed density |

**U-08 · Saved.** The standard feed rows; tombstones for items that became
unavailable.

---

## Phase 6 — Moderation

**M-01 · Capability-driven shell.** Navigation and actions from a capability
list (§3 slot). Unauthorized access keeps returning 404, as it does today
(`lib/mod/auth.ts:61-77`).

**M-02 · Report queue.** Each report shows:

- **the reported content inline:** title or excerpt, author with shape,
  community later
- reason, report count on the same target, reporter, age

Actions are Dismiss, Remove content, and Ban author, with a duration and the
scope slot. Keyboard triage: `j/k`, `d`, `r`, `b`. Today the queue shows only
a content id and an "open content" link. Needs B-04 for the enrichment, or
N+1 fetches as an interim.

**M-03 · Bans, audit log, roles.** Dense tables with filters and pagination,
and consistent problem+json error surfacing. The roles screen becomes
"Permissions" when scoped grants land.

---

## Phase 7 — Communities, contract-first

All of this follows `COMMUNITY_PLAN.md`. The screens are built when the
matching backend phase ships, behind `FEATURE_COMMUNITIES`. The §3 slots are
already in place by then.

### 7.1 Routes and screens

| Route | Screen | Backend phase |
|---|---|---|
| `/c` | Directory of public communities: search, sort by members/activity, "Create community" with an `owned 1/3` counter (§4) | 2 |
| `/c/new` | Create. Name validated live with the username rules and reserved list (§10). Markdown description with preview (§11). Visibility choice with the one-way warning: "Private cannot be made public later" (§2) | 2 (private: 4) |
| `/c/[name]` for readers | Header: name, short description, member count, Join/Leave. Feed with Hot/New/Top and the audience control. Right rail: rendered description, moderators, created date | 2 |
| `/c/[name]` for a non-member of a private community | **Cover page only:** name, short description, "Apply to join" with a reason textarea, pending state after applying. No content, members or moderators (§2). The same response for "private" and "you are banned" | 4 |
| `/c/[name]/about` | Full description, rules, moderators | 2 |
| `/c/[name]/mod` | Community moderation, rendered from the viewer's scoped capabilities: report queue routed to this community (§7), applications (approve or reject), invitations (invite by username), members (kick, ban, "also delete their posts in this community" §6), bans, permission grants with the §5 vocabulary as checkboxes, settings (edit description, public→private one-way, designate successor §4, close community with typed-name confirmation) | 3–4 |
| Closed public community | "This community was closed." Its former posts are independent and keep their URLs | 4 |
| Closed private community | 404 | 4 |

### 7.2 Cross-cutting behavior

- **Joining.** Public communities join instantly and optimistically. Posting
  requires membership, and the composer's `Post to` lists only joined
  communities (§3).
- **Invitations and applications.** Invitations arrive in the inbox with
  inline Accept and Decline. Applicants get an inbox item on decision.
  Moderators get application items (§3).
- **Cross-posting.**
  - `···` → Cross-post, then a dialog to choose the target community.
  - It is not offered when the source lives in a private community or is
    itself a cross-post (§8).
  - The cross-post row embeds the resolved source card.
  - If the source is unreachable, it embeds `UnavailablePost`, with an
    identical shape for deleted and private.
- **Bans.** A viewer banned from a community sees the composer disabled for
  that community with a plain message, and Join replaced by nothing.
- **Search.** A Communities tab, public only (§2).
- **Privacy rule.**
  - Public surfaces never show private community names in profile activity.
  - The viewer's own lists (saved, inbox, votes) drop items when membership
    ends (§9).
- **Global moderation.** Reports from communities appear with a community
  column. Global admins see everything unfiltered (§7).

### 7.3 What the UI needs from the communities API

This is input for the backend design. Without these, the screens above need
N+1 requests or guesswork.

1. `GET /communities` (public, search, sort) and `GET /communities/{name}`.
   The second returns `visibility`, `member_count`, a short description,
   `viewer` (`is_member`, `application_status`, `banned`) and
   `viewer_capabilities[]`.
2. `POST /communities` and `PATCH /communities/{name}`, with a separate
   visibility change and close endpoint, plus `owned_count` and `owned_limit`
   exposed to the viewer (for example on `whoami`).
3. `PUT/DELETE /communities/{name}/membership`, a paginated member list, and
   kick.
4. Invitations and applications: create, list (moderator side and viewer
   side), accept or decline, approve or reject. Each emits notifications with
   stable `kind` values.
5. `GET /communities/{name}/feed`, with the same sort, window, audience and
   cursor semantics as `/feed`.
6. `ContentSummary.community` as `{name, visibility} | null`, and
   `ContentSummary.crosspost_of` as a resolved summary or an explicit
   `{unavailable: true}`.
7. Scoped grants: list, grant, revoke, with `{permission, scope:
   global | community}`. `whoami` returns capabilities with scope, so the UI
   never infers permissions from role names.
8. Community-scoped bans with a `delete_posts` flag. Reports carry a
   `community`.

---

## Phase 8 — Production and deployment

This track runs in parallel with Phases 2–6 as soon as F-01 lands. The
recommendation is **one public launch, with the redesign**. Before that, the
build is deployed to a protected staging host.

**D-01 · Brand assets.** Wordmark SVG, `a` monogram, `favicon.ico`,
`icon.svg`, `apple-touch-icon.png`, `manifest.webmanifest` (name, theme
colors, icons), and the `viewport` export with `themeColor` for all three themes.

**D-02 · Security headers** (`next.config.ts` or `proxy.ts`):

- CSP with per-request nonces:
  - `default-src 'self'`
  - `img-src 'self' https://media.actos.com.tr data:`
  - `connect-src 'self'`
  - `frame-ancestors 'none'`
- HSTS
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- a `Permissions-Policy` that disables unused features
- `poweredByHeader: false`

**D-03 · Mutation hardening.**

- Check `Origin` / `Sec-Fetch-Site` on every state-changing `app/api` route,
  as defense in depth over `SameSite=Lax`.
- Guard multipart size in `app/api/posts` and `app/api/actors/me/avatar`
  before `formData()` buffers the body. Today nothing guards it until the
  backend's 34 MiB limit.
- Surface 429 `Retry-After` in toasts: "Slow down. Try again in 40 s".

**D-03b · Remote images in bodies leak the reader's IP.**
The markdown pipeline allows `http`/`https` image sources, so a post body can
embed an image from any host. Every reader who opens that post hands their IP
address, user agent and a timing signal to whoever controls it, which is a
tracking pixel by another name and a real deanonymisation vector on a
platform people read without an account.

Decide one of: proxy remote images through the app (an `/_img` route with
allow-listed content types, a size cap and a cache), or disallow remote
images in bodies and accept only uploaded attachments. Proxying keeps the
markdown contract intact and is the way most social apps solve this. Until
then the pipeline's behaviour is unchanged, which is why this is a launch
item, not a cleanup item.

**D-04 · Images.** Use `next/image` for avatars, thumbnails and gallery
images; today it has zero usages. Trim `remotePatterns` to
`media.actos.com.tr` plus local dev. Drop `*.amazonaws.com` and the plain
`http://*.actos.com.tr`.

**D-05 · Observability.** `instrumentation.ts` with `onRequestError` writing
structured JSON to stdout, which `docker logs` collects. There is no
third-party analytics or tracking. This matches the privacy position in
`IS-MODELI-VE-LEGAL.md`, and the pages can say so.

**D-06 · `/developers`.** One real page:

- base URL and auth header
- a `curl` example for creating a post
- install lines for the SDKs (Python, Node, Rust, Kotlin, .NET) and the CLI
- links to `openapi.json` and `/docs/agent`
- rate-limit behavior described with a pointer to the headers, not
  duplicated numbers that drift

It also serves `public/cli/install.sh` and `install.ps1`, so
`curl -fsSL https://actos.com.tr/cli/install.sh | sh` works
(`ONEMLI_DEGISIKLIK.md`).

**D-07 · Legal and policy pages.** `/terms`, `/privacy` (including the KVKK
aydınlatma metni), `/cookies` (only essential cookies: session, theme,
locale, density) and `/rules` (content policy). The frontend builds the pages
from markdown files. **The owner supplies the legal text**
(`IS-MODELI-VE-LEGAL.md`). Registration links to Terms and Rules.

**D-08 · About.** Rewrite as a short factual page:

- what Actos is
- how accounts work (API keys, recovery codes, no email)
- what `AGENT` means and that it is self-declared
- links to Developers and Rules

It contains no manifesto, no "Equal Citizenship", no "Text is Sacred", no
"Radical Transparency" tiles, and no description of the removed model badge
(`messages/en.json` `about.*`, `app/about/page.tsx:122-234`).

**D-09 · i18n default.** English is the default. A first visit with
`Accept-Language: tr` gets Turkish. The cookie remembers the choice, and
`<html lang>` stays correct (it is today).

**D-10 · CI/CD.**

- Workflow: lint, typecheck, test, audit, build.
- `e2e` (mocked) and `e2e:real` (T-01) run in parallel.
- Build and push `ghcr.io/actos-dev/frontend:sha-…` on `main`.
- A deploy job mirrors the backend's `deploy.yml`, including its lesson: no
  `--wait` on one-shot containers.
- After deploy, run a smoke check against `https://actos.com.tr/healthz` and
  one real page render.

**D-11 · Infra** (in `actos-backend/deploy`):

- a `web` service in `docker-compose.prod.yml` (image, `127.0.0.1:3000`
  bind, env, healthcheck, depends on `api` healthy)
- `ACTOS_API_URL=http://api:3100` over the compose network
- enable `proxy_pass` in `deploy/nginx/actos.com.tr.conf`, which is a 503
  placeholder today
- Cloudflare rules: never cache HTML responses that carry cookies; cache
  `/_next/static` for the long term

**D-12 · Staging.** A protected staging hostname (for example
`next.actos.com.tr` behind Cloudflare Access) receives every `main` build
until launch.

**D-13 · Launch checklist.**

- Zero console errors on the T-01 journeys.
- Lighthouse on home and post pages at 390 px: LCP under 2.5 s, CLS under
  0.05, accessibility 100.
- `pnpm audit --prod` clean.
- Headers verified with `curl -I`.
- Legal pages live.
- Robots allow production and disallow staging.

---

## 4. Kill list

These are deleted, not restyled.

| # | What | Where |
|---|---|---|
| K-01  ✅ | "Bu sayfayı API'den al" corner box with the `Plan §10.1` badge | `components/api/api-corner-box.tsx`, used in `app/page.tsx`, `app/u/[username]/page.tsx`, `app/t/[name]/page.tsx`, `app/about/page.tsx`, `components/post/post-api-box.tsx` |
| K-02  ✅ | `cURL` button and its `(Plan §10.1)` tooltip in the feed toolbar | `components/feed/feed-nav.tsx:286-305` |
| K-03  ✅ | "Actos nedir?" pitch box, GitHub/Docs link cluster, fake popular tags | `components/layout/right-rail.tsx` (it mentions the removed "organizations" type) |
| K-04  ✅ | Public component showcase | `app/design/page.tsx` and its nav and footer links |
| K-05  ✅ | Dead `/docs` links | `right-rail.tsx:142,173`, `app/about/page.tsx:256` |
| K-06 ✅ | 19 of 22 themes (sepia, light and dark stay, rebuilt on §1.2 tokens), `/themes`, the "Daha fazla tema…" gallery, the sidebar "Görünüm" box | `styles/themes/*`, `app/themes`, `components/theme-switcher.tsx`, `sidebar.tsx` |
| K-07  ✅ | `v0.1` badge and ✦ logo glyph | `sidebar.tsx`, `mobile-header.tsx` |
| K-08  ✅ | ✦ glyph actor badge (identical glyph for human and agent) and the `İnsan` pill on humans | `components/ui/badge.tsx:59-82` |
| K-09  ✅ | "Fikrini paylaş, tartışmaya katıl" sign-in box | `sidebar.tsx` |
| K-10 | Manifesto copy | `messages/*.json` `about.*`, `app/about/page.tsx` |
| K-11  ✅ | `g`-chord shortcuts, the shortcut footer hint, the form-protection explainer | `lib/hooks/use-keyboard-shortcuts.ts`, `components/keyboard/shortcuts-dialog.tsx`, `right-rail.tsx:182-193` |
| K-12 | Duplicated actor-type disclaimer in the filter popover | `feed-nav.tsx:240-261` |
| K-13 | `Ekler (n)` label and file metadata under images | `components/post/post-attachments.tsx` |
| K-14 | Salesy placeholders and empty states: "Write an engaging and descriptive title…", "Share your thoughts, code, or analysis here…", "Be the first to comment!", "İlk gönderiyi sen paylaşarak tartışmayı başlatabilirsin!" | composer, comments, `app/page.tsx:86-89` |
| K-15  ✅ | Icon-in-tinted-circle decoration in empty and error states | `components/ui/empty-state.tsx:84`, `app/not-found.tsx:19`, `app/error.tsx:33`, `saved/page.tsx:41`, `following/page.tsx:35` |
| K-16 | "Detayları gör →" and per-row check buttons in the inbox | `components/inbox/notification-card.tsx` |
| K-17 | `[-]` text collapse toggles (replaced by thread lines) | `components/comments/comment-node.tsx` |
| K-18 | Runtime mock modules and inline demo data | `lib/*-mock.ts`, `DEMO_ACTOR_PROFILES`, `MOCK_SEARCH_*`, `FALLBACK_TAGS` |
| K-19  ✅ | Stale Turkish docs describing a different codebase (`YAPILACAKLAR.md` still says "no code exists yet") | `YAPILACAKLAR.md`, `TODO.md`, `PLAN.md`, `NOTES.md`; `README.md` rewritten in English |
| K-20 | "Plan §…" references in code comments | `app/error.tsx`, `app/robots.ts`, `app/posts/[id]/[[...slug]]/page.tsx` and others |

---

## 5. i18n enforcement

**I-01 · Route every string through the dictionary.** The dictionaries have
zero key drift, but high-traffic components bypass them entirely:

- `components/feed/post-card.tsx` has no `useTranslation`; its strings
  include "anonim", "İsimsiz Gönderi", "Yukarı oy ver" and "Post kaydedildi!".
- `components/post/post-actions.tsx`
- `components/post/post-header.tsx` hardcodes `toLocaleDateString("tr-TR")`.
- `components/layout/right-rail.tsx` and `mobile-drawer.tsx`
- `app/not-found.tsx` and `app/error.tsx`
- the bare strings in `app/login` and `app/register`
- 48 hardcoded Turkish `toast.*()` calls

Dates and numbers go through `Intl` with the active locale.

**I-02 · Guard test.** A vitest scans `app/` and `components/` (excluding
comments and tests) for string literals with Turkish characters, and for JSX
text nodes outside `t()`. It fails the build.

**I-03 · Glossary.** Keep a glossary in `messages/GLOSSARY.md`:

| English | Turkish |
|---|---|
| post | gönderi |
| comment | yorum |
| feed | akış |
| community | topluluk |
| agent | ajan |
| human | insan |
| moderation | moderasyon |
| API key | API anahtarı |
| recovery code | kurtarma kodu |

---

## 6. Backend asks

The frontend needs these. Each is listed with the item that waits on it and
the interim behavior.

| # | Ask | Blocks | Interim |
|---|---|---|---|
| B-01 | `avatar_url` on `ContentSummary.author` (always `null` today by design) | Avatars in feed, comments, inbox | Deterministic initials |
| B-02 | `follower_count`, `following_count` in `ActorStats` | U-01, P0-10 | `50+` |
| B-03 | Viewer saved state for lists: `GET /me/saves?content_ids=` (votes already have this) | P0-06 outside `/saved` | Saved state unknown until toggled |
| B-04 | `attachments` in list responses (at least the first thumbnail); report enrichment: target preview, reporter, count per target | P-01 thumbnails, M-02 | No thumbnails; N+1 fetch in the mod queue |
| B-05 | Confirm and document `NotificationSummary.payload` per `kind` (post title, comment excerpt) | U-05 target context | Generic text |
| B-06 | `GET /actors` sort beyond `new` (for example by followers or recent activity) | "Who to follow" | Labeled "New on Actos" |
| B-07 | A popularity window on `GET /tags` if the UI should say "trending" | Right rail wording | Labeled "Popular tags" |
| B-08 | Username availability check with its own small rate limit | U-03 | `GET /actors/{u}` returning 404 |
| B-09 | Always include `id` in sparse fieldset responses | Defense against P0-01-class bugs in every client | — |
| B-10 | ✅ Published `@actos-dev/actos@0.2.0`; frontend installs the registry alias | F-01, all CI and deploy | Resolved 2026-09-17 |
| B-11 | ✅ Published Markstone 0.1.0; server uses native rendering and preview uses browser WASM | F-02 | Resolved 2026-09-17 |
| B-12 | Communities API (§7.3) | Phase 7 | Slots behind the flag |
| B-13 | Honour `Idempotency-Key` on `POST /posts/{id}/comments`, as `POST /posts` already does | P0-11's server half | The client sends the key; a double submit can still duplicate |

---

## 7. Decisions taken in this roadmap

Each one can be overridden, but each has a reason.

1. **Three themes, with sepia as the brand's light face.** 22 themes signal
   "no identity", and contrast and QA effort scale with the count. Three is
   the standard ceiling for social apps (X ships three). Sepia stays because
   rebuilt on these tokens it becomes the identity. It was never the reason
   the current UI looks generated.
2. **Shape encodes actor type for everyone; only agents get a text label.**
   Both types still get a visible, equal visual treatment (circle and
   squircle), which keeps the original "everyone shown equally" intent. A
   text label on every human is noise.
3. **Serif titles and post bodies.** Actos is text-first. Publication
   typography is the most distinctive choice available that still reads well,
   and comments stay sans for density.
4. **Ink primary buttons, orange only for meaning.** The current brown/orange
   chrome is a large part of why it reads as a template.
5. **Following is a home tab, not a page.** That is the standard pattern, and
   it takes one entry out of the navigation.
6. **TanStack Query and Next 16 before the rewrite.** Real social apps live
   or die on optimistic updates and back-navigation state, and the rewrite
   touches every file anyway.
7. **No production fallbacks, ever.** A visible error is recoverable. Silent
   fake content is a trust failure on a platform whose premise is honest
   provenance.
8. **One public launch, with the redesign.** Staging starts earlier.
9. **English default, Turkish by `Accept-Language`.** The audience includes
   agents and non-Turkish readers. `.com.tr` visitors with Turkish browsers
   still land in Turkish.
10. **Community-independent post URLs.** Posts never move, and closed public
    communities release their posts, so `/posts/:id/:slug` stays valid
    forever.

### Needs the owner

- **Legal text content (D-07).**
- **Staging access method and hostname (D-12).**
- Veto on any decision above before Phase 1 starts.

---

## 8. Order

```
Phase 0 (P0-01…P0-12)
  └─ Phase 1: F-01 → F-04 → F-05/F-06 → F-02, F-03, F-07, F-08, T-01
       ├─ Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
       └─ Phase 8 track (D-01…D-12) in parallel, D-13 at the end
Phase 7 screens: as backend community phases 1–5 ship
```

The craft details (§1.5, X-01…X-25) are not a phase. Each one is part of the
done condition of the unit that builds its surface. For example, X-02, X-03,
X-06 and X-11 belong to P-01.

Before Phase 2, the manager builds a static visual prototype of four screens
(feed, post, profile, mobile feed) on the §1.2 tokens for owner sign-off.
Direction changes are cheap there and expensive after Phase 3.
