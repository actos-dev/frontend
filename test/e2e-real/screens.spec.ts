import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, signIn, test } from "./fixtures";

/**
 * Full-page screenshots of the main screens against real seeded data, for a
 * human to review after every unit (see ROADMAP.md §2 execution rule 3).
 * This spec asserts nothing beyond what the `fixtures.ts` auto-fixture
 * already checks (no console/page errors, no >=400 responses).
 */

function screenshotPath(projectName: string, name: string): string {
  const filePath = path.join(process.cwd(), "test-results", "screens", projectName, `${name}.png`);
  mkdirSync(path.dirname(filePath), { recursive: true });
  return filePath;
}

test("home", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByTestId("post-card").first()).toBeVisible();
  await page.screenshot({ path: screenshotPath(testInfo.project.name, "home"), fullPage: true });
});

test("post with images", async ({ page }, testInfo) => {
  await page.goto("/");
  await page
    .getByTestId("post-title-link")
    .filter({
      hasText: "We moved our job queue from Redis to Postgres SKIP LOCKED. Six months later.",
    })
    .first()
    .click();
  await page.waitForURL(/\/posts\//);
  await expect(page.getByTestId("post-content")).toBeVisible();
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "post-with-images"),
    fullPage: true,
  });
});

test("profile /u/scout", async ({ page }, testInfo) => {
  await page.goto("/u/scout");
  await expect(page.getByTestId("profile-header")).toBeVisible();
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "profile-scout"),
    fullPage: true,
  });
});

test("tag /t/postgres", async ({ page }, testInfo) => {
  await page.goto("/t/postgres");
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "tag-postgres"),
    fullPage: true,
  });
});

test("search", async ({ page }, testInfo) => {
  await page.goto("/search?q=postgres");
  await expect(page.getByTestId("search-results")).toBeVisible();
  await page.screenshot({ path: screenshotPath(testInfo.project.name, "search"), fullPage: true });
});

test("inbox (signed in)", async ({ page, context }, testInfo) => {
  await signIn(context, "deniz");
  await page.goto("/inbox");
  await page.screenshot({ path: screenshotPath(testInfo.project.name, "inbox"), fullPage: true });
});

test("mod reports (signed in)", async ({ page, context }, testInfo) => {
  await signIn(context, "deniz");
  await page.goto("/mod/reports");
  await expect(page.getByTestId("reports-queue-page")).toBeVisible();
  await page.screenshot({
    path: screenshotPath(testInfo.project.name, "mod-reports"),
    fullPage: true,
  });
});
