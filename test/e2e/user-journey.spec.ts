import { expect, test } from "@playwright/test";

test.describe("Faz 18 — Tam Kullanıcı Yolculuğu E2E Senaryosu", () => {
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
    displayName: "Yolculuk Kullanıcısı",
    actorType: "human",
    role: "user",
  };

  test("Eksiksiz Yolculuk: Kayıt -> Giriş -> Post -> Yorum -> Oy -> Arama -> Çıkış", async ({
    page,
  }) => {
    // -------------------------------------------------------------------------
    // Ortak API Mock'ları (İzole, Deterministic E2E)
    // -------------------------------------------------------------------------
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
          body: JSON.stringify({
            ok: true,
            user: mockUser,
          }),
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
              body: "Playwright ile oluşturulmuş uçtan uca gönderi gövdesi.",
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
          comment: {
            id: "comm_journey_1",
            body: "Bu ilk test yorumudur, akış sorunsuz çalışıyor!",
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
        body: JSON.stringify({
          ok: true,
          score: 43,
          userVote: 1,
        }),
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
    // 1. ADIM: KAYIT SİHİRBAZI (3 ADIMLI AKIŞ)
    // =========================================================================
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Yeni Hesap Oluştur/i })).toBeVisible();

    // 1.1 Adım 1: Kimlik Bilgileri
    const usernameInput = page.getByPlaceholder("ornek_kullanici");
    await usernameInput.fill("journey_user");

    const displayNameInput = page.getByPlaceholder(/Ada Lovelace/i);
    await displayNameInput.fill("Yolculuk Kullanıcısı");

    // Aktör tipi seç (İnsan)
    const humanActorBtn = page.getByRole("button", { name: /İnsan/i });
    await humanActorBtn.click();

    // İleri / Devam Et butonuna bas
    const nextBtn = page.getByRole("button", { name: /İleri|Devam Et/i });
    await nextBtn.click();

    // 1.2 Adım 2: Sırların Sunumu ve .txt İndirme
    await expect(page.getByText(/Kurtarma Kodları|API Anahtarı/i)).toBeVisible();
    await expect(page.getByText("ak_e2e_journey_valid_api_key_12345")).toBeVisible();

    // .txt Dosyasını İndir
    const downloadPromise = page.waitForEvent("download");
    const downloadBtn = page.getByRole("button", { name: /Kurtarma Dosyasını İndir/i });
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("actos-recovery-journey_user.txt");

    // Sırlarımı Güvenle Kaydettim -> Adım 3'e geç
    const confirmSavedBtn = page.getByRole("button", { name: /Sırlarımı Güvenle Kaydettim/i });
    await confirmSavedBtn.click();

    // 1.3 Adım 3: Doğrulama
    await expect(page.getByText(/numaralı kurtarma kodunu girin/i)).toBeVisible();

    // İstenen kod indeksini metinden oku (#X)
    const promptText = await page.locator("text=/#\\d+/").textContent();
    const match = promptText?.match(/#(\d+)/);
    const index = match ? parseInt(match[1], 10) - 1 : 0;
    const requiredCode = recoveryCodes[index];

    // İlgili kodu input'a yaz
    const verifyInput = page.getByPlaceholder(/Kurtarma kodunu yapıştırın/i);
    await verifyInput.fill(requiredCode);

    // Doğrula ve Hesabı Aç butonuna bas
    const verifySubmitBtn = page.getByRole("button", { name: /Doğrula ve Hesabı Aç/i });
    await verifySubmitBtn.click();

    // Başarılı doğrulama sonrası anasayfaya dönüldüğünü doğrula
    await expect(page).toHaveURL("/");

    // =========================================================================
    // 2. ADIM: GİRİŞ YAPMA (API ANAHTARI İLE)
    // =========================================================================
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Giriş Yap/i })).toBeVisible();

    const apiKeyInput = page.locator("#apiKey");
    await apiKeyInput.fill("ak_e2e_journey_valid_api_key_12345");

    const loginSubmitBtn = page.getByRole("button", { name: /Giriş Yap/i });
    await loginSubmitBtn.click();

    // Giriş sonrası anasayfada oturumun aktif olduğunu doğrula
    await expect(page).toHaveURL("/");
    await expect(page.getByText("@journey_user")).toBeVisible();

    // =========================================================================
    // 3. ADIM: YENİ POST OLUŞTURMA
    // =========================================================================
    await page.goto("/new");
    await expect(page.getByRole("heading", { name: /Yeni Gönderi/i })).toBeVisible();

    const titleInput = page.getByPlaceholder(/Başlık/i);
    await titleInput.fill("E2E Yolculuk Test Gönderisi");

    const bodyEditor = page.locator("textarea").first();
    await bodyEditor.fill("**Playwright** ile oluşturulmuş uçtan uca gönderi gövdesi.");

    // The production client bundle must fetch and initialize Markstone's
    // browser WASM path, not silently fall back to the Node addon.
    await page.getByRole("tab", { name: /Önizle|Preview/i }).click();
    const preview = page.getByTestId("preview-reading-prose");
    await expect(preview).toBeVisible();
    await expect(preview.locator("strong")).toHaveText("Playwright");
    await page.getByRole("tab", { name: /Yaz|Write/i }).click();

    // Etiket ekle
    const tagsInput = page.getByPlaceholder(/Etiket ekle/i);
    await tagsInput.fill("e2e");
    await tagsInput.press("Enter");

    // Yayınla butonuna tıkla
    const publishBtn = page.getByRole("button", { name: /Yayınla/i });
    await publishBtn.click();

    // Gönderi sayfasına yönlen
    await expect(page).toHaveURL(/\/posts\/post_journey_456/);

    // =========================================================================
    // 4. ADIM: YORUM YAZMA
    // =========================================================================
    const commentInput = page.getByPlaceholder(/Tartışmaya katılın|Düşünceleriniz/i);
    await commentInput.fill("Bu ilk test yorumudur, akış sorunsuz çalışıyor!");

    const commentSubmitBtn = page.getByRole("button", { name: /Yorum Yap|Gönder/i });
    await commentSubmitBtn.click();

    // Yorumun ekranda göründüğünü doğrula
    await expect(page.getByText("Bu ilk test yorumudur, akış sorunsuz çalışıyor!")).toBeVisible();

    // =========================================================================
    // 5. ADIM: OY VERME (VOTING)
    // =========================================================================
    const upvoteButton = page.locator('button[aria-label="Yukarı oy ver"]').first();
    await upvoteButton.click();

    // İyimser olarak oylamanın aktifleştiğini doğrula
    await expect(upvoteButton).toHaveAttribute("aria-pressed", "true");

    // =========================================================================
    // 6. ADIM: ARAMA YAPMA (SEARCH)
    // =========================================================================
    await page.goto("/search");
    const searchInput = page.locator('input[aria-label="Arama kutusu"]');
    await searchInput.fill("Yolculuk");

    // Sonuç kartının render edildiğini doğrula
    await expect(page.getByText("E2E Yolculuk Test Gönderisi").first()).toBeVisible();

    // Sekmeler arasında geçişi test et
    const commentTab = page.getByRole("tab", { name: /Yorumlar/i });
    await commentTab.click();
    await expect(commentTab).toHaveAttribute("data-state", "active");

    // =========================================================================
    // 7. ADIM: ÇIKIŞ YAPMA (LOGOUT)
    // =========================================================================
    const logoutButton = page.locator('button[aria-label="Çıkış yap"]').first();
    await logoutButton.click();

    // Çıkış yapıldıktan sonra "Giriş" butonunun belirdiğini doğrula
    await expect(page.getByRole("link", { name: /Giriş/i }).first()).toBeVisible();
  });
});
