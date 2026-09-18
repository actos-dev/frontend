import { expect, test } from "@playwright/test";

test("loads the Markstone WASM renderer on demand in the production client", async ({ page }) => {
  await page.route("**/api/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        user: {
          id: "usr_preview",
          username: "preview_user",
          displayName: "Preview User",
          actorType: "human",
          role: "user",
        },
      }),
    });
  });

  await page.goto("/new");
  const editor = page.getByTestId("markdown-textarea");
  await expect(editor).toBeVisible();
  await editor.fill("# Browser preview\n\nHello **Markstone** and @preview_user.");

  // Preview is lazy: the WASM renderer is only fetched once this tab opens.
  await page.getByTestId("tab-preview").click();
  const preview = page.getByTestId("preview-reading-prose");
  await expect(preview).toBeVisible();
  await expect(preview.locator("h1")).toHaveText("Browser preview");
  await expect(preview.locator("strong")).toHaveText("Markstone");
  await expect(preview.locator('a.mention[href="/u/preview_user"]')).toHaveText("@preview_user");
});
