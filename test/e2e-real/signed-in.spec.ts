import { expect, signIn, test } from "./fixtures";

const SAVED_TITLES = [
  "Stop centering your app shell at 1200px",
  "Heads up: OpenSSH 10.1 fixes a pre-auth issue in the agent forwarding path",
  "Weekly digest: 5 papers on long-context retrieval worth your time",
  "We moved our job queue from Redis to Postgres SKIP LOCKED. Six months later.",
];

// The two reports pnpm seed:dev creates (see scripts/seed-dev.ts's REPORTS
// constant and the long comment above seedReports() for why these specific
// reason strings). The live queue may contain other reports too — this is a
// real, shared dev backend other processes can also write to — so this spec
// checks that our two known reports are present rather than asserting an
// exact total count.
const SEEDED_REPORT_REASONS = [
  "Looks like automated self-promotion, posted three times this week.",
  "Reads like undisclosed self-promotion for a paid tool; please review under the no-spam guideline.",
];

test.beforeEach(async ({ context }) => {
  await signIn(context, "deniz");
});

test("/saved lists the 4 saved posts", async ({ page }) => {
  await page.goto("/saved");

  const savedStream = page.getByTestId("saved-stream");
  await expect(savedStream.getByTestId("post-card")).toHaveCount(SAVED_TITLES.length);

  const titles = (await savedStream.getByTestId("post-title-link").allTextContents()).map((t) =>
    t.trim(),
  );
  for (const title of SAVED_TITLES) {
    expect(titles).toContain(title);
  }
});

test("/inbox renders without errors", async ({ page }) => {
  await page.goto("/inbox");
  // The fixture already fails the test on any console/page error or >=400
  // response; reaching a stable, signed-in inbox view is the assertion.
  await expect(page.getByTestId("inbox-anonymous-card")).toHaveCount(0);
});

test("/new renders the composer", async ({ page }) => {
  await page.goto("/new");

  await expect(page.getByTestId("post-title-input")).toBeVisible();
  await expect(page.getByTestId("markdown-editor")).toBeVisible();
});

test("/mod/reports lists the seeded reports", async ({ page }) => {
  await page.goto("/mod/reports");

  const reportsList = page.getByTestId("reports-list");
  await expect(reportsList).toBeVisible();

  for (const reason of SEEDED_REPORT_REASONS) {
    await expect(reportsList).toContainText(reason);
  }
});

test("voting on a post changes the displayed score", async ({ page }) => {
  await page.goto("/");

  // deniz authored two of the seeded posts and can't vote on its own
  // content (the vote buttons are disabled for the author) — pick the
  // first card from someone else.
  const cards = page.getByTestId("post-card");
  const cardCount = await cards.count();
  let targetIndex = -1;
  for (let i = 0; i < cardCount; i++) {
    const isOwnPost = await cards.nth(i).locator('a[aria-label="Deniz Aydın\'s profile"]').count();
    if (isOwnPost === 0) {
      targetIndex = i;
      break;
    }
  }
  expect(
    targetIndex,
    "Expected at least one seeded post not authored by deniz",
  ).toBeGreaterThanOrEqual(0);

  const upvoteButton = cards.nth(targetIndex).getByTestId("post-vote-up");
  const scoreLocator = upvoteButton.locator("xpath=following-sibling::span[1]");

  const before = (await scoreLocator.textContent())?.trim();
  await upvoteButton.click();

  // Deliberately scoped to this page load only: persisted vote state after
  // a reload is a known open bug (ROADMAP P0-06), covered by a later unit.
  await expect(scoreLocator).not.toHaveText(before ?? "");
});
