import { expect, test } from "@playwright/test";

test.describe("Mobile viewport and experience (<768px)", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.beforeEach(async ({ page }) => {
    // Isolate the suite from any backend: mock the browser-facing feed/session.
    await page.route("**/api/feed**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "post_mobile_1",
              title: "Mobile Interface Test Post",
              body: "Content text for the mobile viewport tests.",
              score: 42,
              commentCount: 5,
              tags: ["mobile", "test"],
              contentType: "post",
              author: {
                id: "usr_mob_1",
                username: "mobilci",
                displayName: "Mobil Geliştirici",
                actorType: "human",
              },
              createdAt: new Date().toISOString(),
            },
          ],
          nextCursor: null,
        }),
      });
    });

    await page.route("**/api/session**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, user: null }),
      });
    });
  });

  test("1. the bottom tab bar is visible and navigates", async ({ page }) => {
    await page.goto("/");

    const mobileNav = page.getByRole("navigation", { name: "Mobile tab bar" });
    await expect(mobileNav).toBeVisible();

    // Every primary destination is present and reachable.
    const feedTab = mobileNav.getByRole("link", { name: "Home" });
    const searchTab = mobileNav.getByRole("link", { name: "Search" });
    const newPostButton = mobileNav.getByRole("link", { name: "New Post" });
    const inboxTab = mobileNav.getByRole("link", { name: "Notifications" });

    await expect(feedTab).toBeVisible();
    await expect(searchTab).toBeVisible();
    await expect(newPostButton).toBeVisible();
    await expect(inboxTab).toBeVisible();

    await searchTab.click();
    await expect(page).toHaveURL(/\/search/);

    await feedTab.click();
    await expect(page).toHaveURL("/");
  });

  test("2. the mobile top bar account menu opens and closes", async ({ page }) => {
    // The hamburger drawer was deleted in the overhaul; the mobile top bar's
    // avatar popover is the equivalent menu surface (ROADMAP S-02).
    await page.route("**/api/session**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          user: {
            id: "usr_mob_1",
            username: "mobilci",
            displayName: "Mobil Geliştirici",
            actorType: "human",
            role: "user",
          },
        }),
      });
    });

    await page.goto("/");

    const menuButton = page.getByRole("button", { name: /mobilci/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const logoutItem = page.getByRole("button", { name: "Log Out" });
    await expect(logoutItem).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(logoutItem).not.toBeVisible();
  });

  test("3. the desktop sidebar is hidden on mobile", async ({ page }) => {
    await page.goto("/");

    const desktopSidebar = page.locator("aside").first();
    await expect(desktopSidebar).toBeHidden();
  });

  test("4. the mobile view has no horizontal overflow", async ({ page }) => {
    await page.goto("/");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
