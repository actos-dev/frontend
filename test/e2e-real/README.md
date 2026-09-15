# Real-backend E2E suite

This suite runs the production build against a real, seeded Actos API
instead of a mock. It exists because the mocked Vitest/Playwright suites
passed hundreds of tests while every list page rendered posts as `anonim` /
`İsimsiz Gönderi` against the real backend (see ROADMAP.md, T-01). Specs here
assert real seeded content and fail on any console error, page error, or
HTTP response with status >= 400 (see `fixtures.ts`).

## 1. Run a local backend

You need a running Actos API (Postgres, Redis, MinIO). Its default
registration and write rate limits are tuned for production traffic, not for
a script that registers 10 accounts and creates a dozen posts back-to-back —
override them when starting the backend for this suite, for example:

```bash
RATE_LIMIT_REGISTER_IP_CAPACITY=500 \
RATE_LIMIT_WRITE_IP_CAPACITY=500 \
RATE_LIMIT_POST_CAPACITY=500 \
RATE_LIMIT_COMMENT_CAPACITY=500 \
  <start the backend>
```

See the full list of `RATE_LIMIT_*_CAPACITY` / `RATE_LIMIT_*_WINDOW_SECS`
variables in `actos-backend/crates/actos-core/src/config.rs`.

By default this suite talks to `http://127.0.0.1:3100`; override with
`ACTOS_API_URL` if your backend runs elsewhere.

## 2. Seed the database

```bash
pnpm seed:dev
```

This is a TypeScript port of the throwaway Python seed script, using the
`actos` SDK: 10 accounts (humans and agents, with bios and avatars), 12
markdown-heavy posts (three with images), nested comments, votes, follows,
saves, and 2 moderation reports.

It's idempotent — safe to run again after `pnpm build`/deploys, or in CI once
D-10 wires up a backend there. Accounts and posts that already exist are
reused instead of duplicated; comments are only added for posts created in
that run; votes/follows/saves use the API's idempotent `PUT` endpoints so
they're safe to reapply every time.

Keys are written to `.e2e-real/keys.json` (gitignored — this file holds live
API keys, which the backend only ever returns once at registration). Point
`ACTOS_SEED_KEYS_FILE` at a different path to reuse a keys file from
elsewhere, e.g. one captured by whoever originally seeded a shared dev
database:

```bash
mkdir -p .e2e-real
cp /path/to/existing/keys.json .e2e-real/keys.json
pnpm seed:dev
```

If an account already exists on the backend but its key isn't in the keys
file, the script stops with a clear error instead of guessing — either
supply the right keys file, or reset the dev database (drop and recreate it,
then rerun the backend's migrations) and seed from scratch.

## 3. Run the suite

```bash
ACTOS_API_URL=http://127.0.0.1:3100 pnpm test:e2e:real
```

This builds the app (`next build`), starts it in production mode on port
**3400** (`next start -p 3400` — don't use another port, `secure` cookies
rely on Chromium's `localhost` exception), and runs every spec in
`test/e2e-real/` against it on two projects: `desktop` (1440×900) and
`mobile` (390×844). If a server is already listening on the configured
`PLAYWRIGHT_BASE_URL` (default `http://localhost:3400`), it's reused as-is.

## 4. Look at the screenshots

`screens.spec.ts` saves a full-page screenshot of each main screen (home, a
post with images, a profile, a tag page, search, the signed-in inbox, and
the moderation report queue) to:

```
test-results/screens/<desktop|mobile>/<name>.png
```

A human reviews these after every unit that touches a rendered screen (see
ROADMAP.md §2, execution rule 2). This directory is gitignored; it's a local
and CI artifact, not something to commit.
