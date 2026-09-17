import { expect, test } from "@playwright/test";

test.describe("Faz 18 — Moderasyon Güvenlik ve Anti-Leak Denetimi", () => {
  const modRoutes = ["/mod", "/mod/reports", "/mod/bans", "/mod/actions", "/mod/roles"];

  const modApiRoutes = ["/api/mod/reports", "/api/mod/bans", "/api/mod/actions", "/api/mod/roles"];

  test.describe("1. Anonim / Kimliği Belirsiz Kullanıcı Denetimi (Anti-Leak)", () => {
    for (const route of modRoutes) {
      test(`anonim kullanıcı "${route}" sayfasına gittiğinde 404 almalıdır`, async ({ page }) => {
        const response = await page.goto(route);
        expect(response).not.toBeNull();
        expect(response?.status()).toBe(404);

        // Arayüzde 404 / Bulunamadı mesajının render edildiğini doğrula
        await expect(
          page
            .getByRole("heading", { name: /404|bulunamadı|not found/i })
            .or(page.locator("text=/Sayfa bulunamadı/i")),
        ).toBeVisible();

        // Asla 401 Unauthorized veya 403 Forbidden sızdırmamalıdır
        expect(response?.status()).not.toBe(401);
        expect(response?.status()).not.toBe(403);
      });
    }

    for (const apiRoute of modApiRoutes) {
      test(`anonim kullanıcı "${apiRoute}" API ucuna GET attığında 404 Not Found dönmelidir`, async ({
        request,
      }) => {
        const response = await request.get(apiRoute);
        expect(response.status()).toBe(404);

        const body = await response.json();
        expect(body.status).toBe(404);
        expect(body.code).toBe("NOT_FOUND");

        // Hassas önbellek sızıntısını önleyen Cache-Control başlığını doğrula
        const cacheControl = response.headers()["cache-control"] || "";
        expect(cacheControl).toContain("private");
      });

      test(`anonim kullanıcı "${apiRoute}" API ucuna POST attığında da 404 Not Found dönmelidir`, async ({
        request,
      }) => {
        const response = await request.post(apiRoute, {
          data: { test: true },
        });
        expect(response.status()).toBe(404);
        const body = await response.json();
        expect(body.code).toBe("NOT_FOUND");
      });
    }
  });

  test.describe("2. Rolsüz / Standart Kullanıcı Denetimi (Anti-Leak Doğrulaması)", () => {
    test("standart kullanıcı (rol: 'user') moderasyon sayfalarına eriştiğinde 404 almalıdır", async ({
      page,
      context,
    }) => {
      // Mock /api/session ve çerezler üzerinden standart oturum kur
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

      await expect(
        page
          .getByRole("heading", { name: /404|bulunamadı|not found/i })
          .or(page.locator("text=/Sayfa bulunamadı/i")),
      ).toBeVisible();
    });
  });
});
