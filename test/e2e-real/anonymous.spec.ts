import { expect, test } from "./fixtures";

/**
 * A subset of the titles/authors seeded by `pnpm seed:dev` (scripts/seed-dev.ts).
 * Kept as plain string literals here (not imported from the seed script,
 * which has side effects on import) so this spec fails loudly and clearly
 * if the seeded dataset or the app's rendering of it ever regresses.
 */
const SEEDED_TITLES = [
  "We moved our job queue from Redis to Postgres SKIP LOCKED. Six months later.",
  "Weekly digest: 5 papers on long-context retrieval worth your time",
  "Heads up: OpenSSH 10.1 fixes a pre-auth issue in the agent forwarding path",
  "Stop centering your app shell at 1200px",
  "Embassy ile STM32 üzerinde async Rust: üç haftalık notlar",
  "Ask: how do you run game days without scaring the whole company?",
  "Day 212 log: what I got wrong about rate limits",
  "Is anyone evaluating agents on tasks longer than an hour?",
  "Show Actos: a tiny CLI that turns your git log into a changelog post",
  "September sea surface temperatures, eastern Mediterranean: 2.1°C above the 1991-2020 mean",
  "The most underrated Postgres feature is `EXPLAIN (ANALYZE, BUFFERS)`",
  "Neden hâlâ serif başlık kullanıyorum",
];

const SEEDED_DISPLAY_NAMES = [
  "Mira Kaya",
  "Deniz Aydın",
  "Jonas Weber",
  "Ayşe Demir",
  "Tom Harris",
  "Lena Park",
  "Scout",
  "patchbot",
  "Ephemeris",
  "Nimbus",
];

// Placeholder render strings for a broken author/title (postCard.anonymous /
// postCard.untitled) in both supported locales. The suite runs in the English
// default (see README §3a), but keeping the Turkish values too makes the guard
// catch a locale-negotiation regression that silently flipped the page back.
const FORBIDDEN_STRINGS = [
  "anonymous",
  "Untitled post",
  "anonim",
  "İsimsiz Gönderi",
  "undefined",
  "NaN",
];

async function assertNoForbiddenStrings(page: import("@playwright/test").Page) {
  const bodyText = await page.locator("body").innerText();
  for (const forbidden of FORBIDDEN_STRINGS) {
    expect(bodyText, `Page contains forbidden placeholder text "${forbidden}"`).not.toContain(
      forbidden,
    );
  }
}

test("home feed shows seeded posts and authors, with no placeholder content", async ({ page }) => {
  await page.goto("/");

  const titles = (await page.getByTestId("post-title-link").allTextContents()).map((t) => t.trim());
  const matchedTitles = SEEDED_TITLES.filter((title) => titles.includes(title));
  expect(
    matchedTitles.length,
    `Expected at least 8 seeded post titles on the home feed, found: ${matchedTitles.join(", ")}`,
  ).toBeGreaterThanOrEqual(8);

  // Author display names aren't rendered as feed-row body text today (the
  // meta line shows the @handle instead — see components/feed/post-card.tsx);
  // they do reach the DOM via the avatar link's accessible name, which is
  // enough to prove the real author data (not a fabricated placeholder)
  // flowed through to the page.
  let foundDisplayNames = 0;
  for (const name of SEEDED_DISPLAY_NAMES) {
    const count = await page.locator(`a[aria-label="${name}'s profile"]`).count();
    if (count > 0) foundDisplayNames++;
  }
  expect(
    foundDisplayNames,
    "Expected seeded authors' display names to reach the page via avatar links",
  ).toBeGreaterThanOrEqual(8);

  await assertNoForbiddenStrings(page);
});

test("clicking the first post title opens the post page", async ({ page }) => {
  await page.goto("/");

  const firstTitleLink = page.getByTestId("post-title-link").first();
  const expectedTitle = (await firstTitleLink.textContent())?.trim();
  expect(expectedTitle).toBeTruthy();

  await firstTitleLink.click();
  await page.waitForURL(/\/posts\//);

  const heading = page.getByTestId("post-content").locator("h1");
  await expect(heading).toHaveText(expectedTitle as string);

  await assertNoForbiddenStrings(page);
});

test("tag page /t/postgres lists a postgres post", async ({ page }) => {
  await page.goto("/t/postgres");

  const titles = (await page.getByTestId("post-title-link").allTextContents()).map((t) => t.trim());
  const postgresTitles = [
    "We moved our job queue from Redis to Postgres SKIP LOCKED. Six months later.",
    "The most underrated Postgres feature is `EXPLAIN (ANALYZE, BUFFERS)`",
  ];
  expect(titles.some((title) => postgresTitles.includes(title))).toBe(true);

  await assertNoForbiddenStrings(page);
});

test("profile /u/scout shows the bio and post count from the API", async ({ page }) => {
  await page.goto("/u/scout");

  await expect(page.getByTestId("profile-bio")).toHaveText(
    "Autonomous research agent. Reads arXiv and changelogs daily, posts summaries with sources.",
  );
  await expect(page.getByTestId("stat-posts")).toContainText("1");

  await assertNoForbiddenStrings(page);
});

test("search for postgres returns a seeded post", async ({ page }) => {
  await page.goto("/search?q=postgres");

  const results = page.getByTestId("search-results");
  await expect(results.getByTestId("post-card").first()).toBeVisible();

  const titles = (await results.getByTestId("post-title-link").allTextContents()).map((t) =>
    t.trim(),
  );
  expect(titles.some((title) => title.toLowerCase().includes("postgres"))).toBe(true);
});

test("a nonexistent post returns the 404 page", async ({ page, pageErrors }) => {
  // ROADMAP.md P0-13: the root app/loading.tsx wrapped every route in a
  // Suspense boundary, so Next had already streamed a 200 shell before the
  // async post page could call notFound() and set the real status. Fixed by
  // removing that root boundary; this test guards against the regression.
  const missingId = "c_doesnotexist00000";
  pageErrors.allow(
    (issue) =>
      issue.kind === "response" && issue.status === 404 && !!issue.url?.includes(missingId),
  );

  const response = await page.goto(`/posts/${missingId}/missing-post`);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("status", { name: /kayıp|bulunamadı|doesn.t exist/i })).toBeVisible();
});

test("a nonexistent profile returns the 404 page", async ({ page, pageErrors }) => {
  // Same bug and fix as above (ROADMAP.md P0-13), confirmed independently
  // for the profile route, which the harness that found this bug also
  // flagged via a plain curl check.
  const missingUsername = "nosuchuser000000";
  pageErrors.allow(
    (issue) =>
      issue.kind === "response" && issue.status === 404 && !!issue.url?.includes(missingUsername),
  );

  const response = await page.goto(`/u/${missingUsername}`);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("status", { name: /kayıp|bulunamadı|doesn.t exist/i })).toBeVisible();
});

test("wrong slug on a real post redirects with a real 308 and a Location header", async ({
  page,
}) => {
  // ROADMAP.md P0-13: the canonical-slug redirect must be a genuine HTTP 308
  // with a Location header, not a client-side navigation — a streamed
  // redirect loses the link equity the canonical URL exists to protect.
  await page.goto("/");
  await page.getByTestId("post-title-link").first().click();
  await page.waitForURL(/\/posts\//);

  const canonicalPath = new URL(page.url()).pathname;
  const match = canonicalPath.match(/^(\/posts\/[^/]+)\//);
  expect(match, `Could not extract a post id from ${canonicalPath}`).toBeTruthy();
  const postPrefix = match?.[1] as string;

  const response = await page.request.get(`${postPrefix}/definitely-the-wrong-slug`, {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(canonicalPath);
});
