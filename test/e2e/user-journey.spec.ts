import { expect, test } from "@playwright/test";

test.describe("Full user journey E2E", () => {
  const recoveryCodes = [
    "rec-1111-2222",
    "rec-3333-4444",
    "rec-5555-6666",
    "rec-7777-8888",
    "rec-9999-0000",
    "rec-aaaa-bbbb",
    "rec-cccc-dddd",
    "rec-eeee-ffff",
    "rec-1234-5678",
    "rec-9876-5432",
  ];

  const mockUser = {
    id: "usr_journey_1",
    username: "journey_user",
    displayName: "Journey User",
    actorType: "human",
    role: "user",
  };

  const commentBody = "This is the first test comment, and the flow works!";

  test("complete journey: register -> login -> post -> comment -> vote -> search -> logout", async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // Shared browser-facing API mocks (deterministic, backend-independent).
    // -------------------------------------------------------------------------
    await page.route("**/api/register/availability**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, available: true }),
      });
    });

    await page.route("**/api/register/actors**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, items: [] }),
      });
    });

    await page.route("**/api/register", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          apiKey: "ak_e2e_journey_valid_api_key_12345",
          recoveryCodes,
        }),
      });
    });

    await page.route("**/api/session", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, user: mockUser }),
        });
      } else if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, user: mockUser }),
        });
      }
    });

    await page.route("**/api/posts", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: {
              id: "post_journey_456",
              slug: "e2e-yolculuk-test-gonderisi",
              title: "E2E Yolculuk Test Gönderisi",
              body: "**Playwright** ile oluşturulmuş uçtan uca gönderi gövdesi.",
              tags: ["test", "e2e"],
            },
          }),
        });
      }
    });

    await page.route("**/api/comments", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            id: "comm_journey_1",
            body: commentBody,
            createdAt: new Date().toISOString(),
            author: mockUser,
          },
        }),
      });
    });

    await page.route("**/api/actions/vote", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: { score: 43, userVote: 1 } }),
      });
    });

    await page.route("**/api/search**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          items: [
            {
              id: "post_journey_456",
              title: "E2E Yolculuk Test Gönderisi",
              body: "Playwright ile oluşturulmuş uçtan uca gönderi gövdesi.",
              score: 43,
              tags: ["test", "e2e"],
              contentType: "post",
              author: mockUser,
            },
          ],
          nextCursor: null,
        }),
      });
    });

    // =========================================================================
    // STEP 1: REGISTRATION WIZARD (4 STEPS)
    // =========================================================================
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "1. Identity" })).toBeVisible();

    // 1.1 Identity
    await page.locator("#username").fill("journey_user");
    await page.getByRole("radio", { name: /Human/ }).check();
    await page.getByRole("button", { name: "Continue" }).click();

    // 1.2 Secrets
    await expect(page.getByRole("heading", { name: "2. Secrets" })).toBeVisible();
    await expect(page.getByText("ak_e2e_journey_valid_api_key_12345")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download \.txt/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("actos-recovery-journey_user.txt");

    await page.getByRole("button", { name: /I Have Stored My Codes Safely/i }).click();

    // 1.3 Verification
    await expect(page.getByRole("heading", { name: "3. Verification" })).toBeVisible();
    const promptText = await page.getByText(/Please enter your \d+\. recovery code/i).textContent();
    const index = Number(promptText?.match(/(\d+)\./)?.[1] ?? "1") - 1;
    const requiredCode = recoveryCodes[index];
    await page.getByPlaceholder("Enter recovery code...").fill(requiredCode);
    await page.getByRole("button", { name: /Verify & Activate Account/i }).click();

    // 1.4 Optional profile onboarding — skip it and land on the feed.
    await expect(page.getByRole("heading", { name: "4. Your profile" })).toBeVisible();
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page).toHaveURL("/");

    // =========================================================================
    // STEP 2: LOG IN WITH THE API KEY
    // =========================================================================
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();

    await page.locator("#apiKey").fill("ak_e2e_journey_valid_api_key_12345");
    await page.getByRole("button", { name: "Log In" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: /journey_user/ })).toBeVisible();

    // =========================================================================
    // STEP 3: CREATE A POST
    // =========================================================================
    await page.goto("/new");
    await expect(page.getByRole("heading", { name: "Create New Post" })).toBeVisible();

    await page.getByTestId("post-title-input").fill("E2E Yolculuk Test Gönderisi");
    await page.getByTestId("markdown-textarea").fill("**Playwright** ile uçtan uca gövde.");

    // Preview must render through Markstone, not a plain-text fallback.
    await page.getByTestId("tab-preview").click();
    const preview = page.getByTestId("preview-reading-prose");
    await expect(preview).toBeVisible();
    await expect(preview.locator("strong")).toHaveText("Playwright");
    await page.getByTestId("tab-write").click();

    const tagsInput = page.getByPlaceholder(/Add tag/);
    await tagsInput.fill("e2e");
    await tagsInput.press("Enter");

    await page.getByTestId("publish-button").click();
    await expect(page).toHaveURL(/\/posts\/post_journey_456/);
    await expect(page.getByTestId("post-actions-bar")).toBeVisible();

    // =========================================================================
    // STEP 4: COMMENT
    // =========================================================================
    await page.getByRole("textbox", { name: "Add a comment" }).fill(commentBody);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(commentBody)).toBeVisible();

    // =========================================================================
    // STEP 5: VOTE
    // =========================================================================
    const upvoteButton = page.getByRole("button", { name: "Upvote" }).first();
    await upvoteButton.click();
    await expect(upvoteButton).toHaveAttribute("aria-pressed", "true");

    // =========================================================================
    // STEP 6: SEARCH
    // =========================================================================
    await page.goto("/search");
    await page.locator('input[aria-label="Search"]').fill("Yolculuk");
    await expect(page.getByText("E2E Yolculuk Test Gönderisi").first()).toBeVisible();

    const commentTab = page.getByRole("tab", { name: "Comments" });
    await commentTab.click();
    await expect(commentTab).toHaveAttribute("data-state", "active");

    // =========================================================================
    // STEP 7: LOG OUT
    // =========================================================================
    await page.getByRole("button", { name: /journey_user/ }).click();
    await page.getByRole("button", { name: "Log Out" }).click();

    await expect(page.getByRole("link", { name: "Log In" }).first()).toBeVisible();
  });
});
