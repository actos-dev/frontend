import { expect, test } from "@playwright/test";

test.describe("Moderation security and anti-leak audit", () => {
  const modRoutes = ["/mod", "/mod/reports", "/mod/bans", "/mod/actions", "/mod/roles"];

  // Each route only exports the HTTP methods it actually serves; calling an
  // unsupported method answers 405, not the anti-leak 404, so the spec probes
  // the supported method. `/api/mod/permissions` is the 0.3.0 replacement for
  // the retired `/api/mod/roles` writer.
  const modApiCalls: Array<{
    label: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    data?: unknown;
  }> = [
    { label: "reports", method: "GET", path: "/api/mod/reports" },
    { label: "bans", method: "POST", path: "/api/mod/bans", data: { test: true } },
    { label: "actions", method: "GET", path: "/api/mod/actions" },
    {
      label: "permissions (grant)",
      method: "PUT",
      path: "/api/mod/permissions",
      // A well-formed body so the request reaches the anti-leak guard rather
      // than the earlier 400 validation branch.
      data: { username: "someone", permission: "content.delete" },
    },
    {
      label: "permissions (revoke)",
      method: "DELETE",
      path: "/api/mod/permissions",
      data: { username: "someone", permission: "content.delete" },
    },
  ];

  test.describe("1. Anonymous visitor audit (anti-leak)", () => {
    for (const route of modRoutes) {
      test(`anonymous visitor gets a 404 at "${route}"`, async ({ page }) => {
        const response = await page.goto(route);
        expect(response).not.toBeNull();
        expect(response?.status()).toBe(404);

        // The localized 404 page is rendered, never a sign-in prompt.
        await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();

        // Never leak 401 Unauthorized or 403 Forbidden.
        expect(response?.status()).not.toBe(401);
        expect(response?.status()).not.toBe(403);
      });
    }

    for (const { label, method, path, data } of modApiCalls) {
      test(`anonymous ${method} "${path}" (${label}) answers 404 Not Found`, async ({
        request,
      }) => {
        const response = await request.fetch(path, {
          method,
          data: method === "GET" ? undefined : data,
        });
        expect(response.status()).toBe(404);

        const body = await response.json();
        expect(body.status).toBe(404);
        expect(body.code).toBe("NOT_FOUND");

        // Sensitive responses must not be cached by shared proxies.
        const cacheControl = response.headers()["cache-control"] || "";
        expect(cacheControl).toContain("private");
      });
    }
  });

  test.describe("2. Standard user audit (anti-leak)", () => {
    test("a standard user (role 'user') gets a 404 on moderation pages", async ({
      page,
      context,
    }) => {
      // A session token exists, but the actor holds no moderation grants.
      await context.addCookies([
        {
          name: "actos_token",
          value: "standard_user_token_no_mod",
          domain: "localhost",
          path: "/",
        },
      ]);

      await page.route("**/api/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            user: {
              id: "usr_standard",
              username: "normal_user",
              role: "user",
            },
          }),
        });
      });

      const response = await page.goto("/mod/reports");
      expect(response?.status()).toBe(404);

      await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
    });
  });
});
