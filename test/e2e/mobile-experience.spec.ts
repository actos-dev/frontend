import { expect, test } from "@playwright/test";

test.describe("Faz 18 — Mobil Viewport ve Deneyim Testleri (<768px)", () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 13 / Modern Android boyutu
  });

  test.beforeEach(async ({ page }) => {
    // API çağrılarını mock'layarak izole çalışmasını garanti et
    await page.route("**/api/feed**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "post_mobile_1",
              title: "Mobil Arayüz Test Gönderisi",
              body: "Mobil viewport testleri için içerik metni.",
              score: 42,
              commentCount: 5,
              tags: ["mobil", "test"],
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

  test("1. Mobil alt sekme çubuğu (Bottom Tab Bar) görünür ve gezinme yapılabilir olmalıdır", async ({
    page,
  }) => {
    await page.goto("/");

    const mobileNav = page.locator('nav[aria-label="Mobil Alt Sekme Çubuğu"]');
    await expect(mobileNav).toBeVisible();

    // Dört ana sekmenin ve yeni post butonunun varlığını doğrula
    const feedTab = mobileNav.getByRole("link", { name: /(Akış|Feed)/i });
    const searchTab = mobileNav.getByRole("link", { name: /(Arama|Search|Keşfet)/i });
    const newPostButton = mobileNav.getByRole("link", { name: /(Yeni Post|New Post)/i });
    const inboxTab = mobileNav.getByRole("link", { name: /(Bildirim|Notification)/i });

    await expect(feedTab).toBeVisible();
    await expect(searchTab).toBeVisible();
    await expect(newPostButton).toBeVisible();
    await expect(inboxTab).toBeVisible();

    // Arama sekmesine tıkla
    await searchTab.click();
    await expect(page).toHaveURL(/\/search/);

    // Tekrar Akış sekmesine tıkla
    await feedTab.click();
    await expect(page).toHaveURL("/");
  });

  test("2. Hamburger menü tıklanarak çekmece (drawer) açılmalı ve kapatılabilmelidir", async ({
    page,
  }) => {
    await page.goto("/");

    const hamburgerBtn = page.getByRole("button", { name: "Menüyü aç" });
    await expect(hamburgerBtn).toBeVisible();

    // Çekmeceyi aç
    await hamburgerBtn.click();

    // Çekmecenin açıldığını doğrula
    const drawerDialog = page.getByRole("dialog");
    await expect(drawerDialog).toBeVisible();
    await expect(page.getByText("Menü")).toBeVisible();

    // Kapatma butonuna tıkla
    const closeBtn = page.getByRole("button", { name: "Menüyü Kapat" });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Çekmecenin kapandığını doğrula
    await expect(drawerDialog).not.toBeVisible();
  });

  test("3. Masaüstü kenar çubuğu (sidebar) mobilde gizli olmalıdır", async ({ page }) => {
    await page.goto("/");

    const desktopSidebar = page.locator("aside").first();
    await expect(desktopSidebar).toBeHidden();
  });

  test("4. Mobil görünümde yatay kaydırma (horizontal overflow) olmamalıdır", async ({ page }) => {
    await page.goto("/");

    // Sayfa genişliği viewport genişliğini aşmamalı
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
