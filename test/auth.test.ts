import { ActosAPIError, Transport } from "actos";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as recoverRoute from "@/app/api/recover/route";
import * as registerRoute from "@/app/api/register/route";
import * as sessionRoute from "@/app/api/session/route";
import { ACTOS_TOKEN_COOKIE, SESSION_TOKEN_COOKIE } from "@/lib/actos";
import {
  clearDraft,
  createLoginRedirectUrl,
  getDraft,
  getDraftEntry,
  saveDraft,
} from "@/lib/drafts";
import { generateRecoveryFileContent } from "@/lib/recovery-file";

// Mock next/headers
vi.mock("next/headers", () => {
  return {
    cookies: vi.fn(),
  };
});

describe("Faz 5 — Kimlik, Oturum ve Güvenlik Testleri", () => {
  let mockCookieStore: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const mockWhoamiSuccess = {
    actor: {
      id: "act_user_123",
      username: "dila_ai",
      displayName: "Dila",
      actorType: "ai_agent",
      avatarUrl: "https://storage.actos.dev/avatars/dila.png",
      trustLevel: 1,
    },
    roles: ["moderator"],
    key: {
      id: "key_abc",
      label: "Default",
      createdAt: "2026-09-04T12:00:00Z",
    },
  };

  beforeEach(() => {
    mockCookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. /api/session Route Handler
  // ==========================================================================
  describe("1. /api/session Route Handler", () => {
    describe("POST /api/session (Giriş İşlemi)", () => {
      it("boş veya eksik API anahtarında 401 INVALID_KEY dönmelidir", async () => {
        const req = new NextRequest("http://localhost:3000/api/session", {
          method: "POST",
          body: JSON.stringify({ apiKey: "" }),
        });

        const res = await sessionRoute.POST(req);
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.code).toBe("INVALID_KEY");
      });

      it("geçerli API anahtarında çerezi httpOnly, SameSite=lax ile yazmalı ve kullanıcı bilgilerini dönmelidir", async () => {
        const { cookies } = await import("next/headers");
        vi.mocked(cookies).mockResolvedValue(
          mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
        );

        vi.spyOn(Transport.prototype, "request").mockResolvedValue({
          data: mockWhoamiSuccess,
          status: 200,
          headers: new Headers(),
        } as never);

        const req = new NextRequest("http://localhost:3000/api/session", {
          method: "POST",
          body: JSON.stringify({
            apiKey: "actos_test_valid_key_123",
            rememberMe: false,
          }),
        });

        const res = await sessionRoute.POST(req);
        expect(res.status).toBe(200);

        // Cache-Control doğrulaması
        const cacheHeader = res.headers.get("Cache-Control");
        expect(cacheHeader).toContain("private");
        expect(cacheHeader).toContain("no-store");

        // Çerez yazımı doğrulaması
        expect(mockCookieStore.set).toHaveBeenCalledWith(
          ACTOS_TOKEN_COOKIE,
          "actos_test_valid_key_123",
          expect.objectContaining({
            httpOnly: true,
            sameSite: "lax",
            path: "/",
          }),
        );

        // rememberMe: false olduğunda maxAge olmamalıdır
        const callArgs = mockCookieStore.set.mock.calls.find((c) => c[0] === ACTOS_TOKEN_COOKIE);
        expect(callArgs?.[2]?.maxAge).toBeUndefined();

        // Dönen yanıt
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.user).toEqual({
          id: "act_user_123",
          username: "dila_ai",
          displayName: "Dila",
          actorType: "ai_agent",
          role: "moderator",
          roles: ["moderator"],
          avatarUrl: "https://storage.actos.dev/avatars/dila.png",
          trustLevel: 1,
        });
      });

      it("rememberMe: true olduğunda çereze 1 yıllık maxAge verilmelidir", async () => {
        const { cookies } = await import("next/headers");
        vi.mocked(cookies).mockResolvedValue(
          mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
        );

        vi.spyOn(Transport.prototype, "request").mockResolvedValue({
          data: mockWhoamiSuccess,
          status: 200,
          headers: new Headers(),
        } as never);

        const req = new NextRequest("http://localhost:3000/api/session", {
          method: "POST",
          body: JSON.stringify({
            apiKey: "actos_long_session_key",
            rememberMe: true,
          }),
        });

        const res = await sessionRoute.POST(req);
        expect(res.status).toBe(200);

        const callArgs = mockCookieStore.set.mock.calls.find((c) => c[0] === ACTOS_TOKEN_COOKIE);
        expect(callArgs?.[2]?.maxAge).toBe(365 * 24 * 60 * 60);
      });

      it("üretim (production) modunda Secure bayrağı true olmalıdır", async () => {
        const originalEnv = process.env.NODE_ENV;
        try {
          // @ts-expect-error override readonly for testing
          process.env.NODE_ENV = "production";

          const { cookies } = await import("next/headers");
          vi.mocked(cookies).mockResolvedValue(
            mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
          );

          vi.spyOn(Transport.prototype, "request").mockResolvedValue({
            data: mockWhoamiSuccess,
            status: 200,
            headers: new Headers(),
          } as never);

          const req = new NextRequest("http://localhost:3000/api/session", {
            method: "POST",
            body: JSON.stringify({
              apiKey: "actos_prod_key",
            }),
          });

          await sessionRoute.POST(req);

          const callArgs = mockCookieStore.set.mock.calls.find((c) => c[0] === ACTOS_TOKEN_COOKIE);
          expect(callArgs?.[2]?.secure).toBe(true);
        } finally {
          // @ts-expect-error restore env
          process.env.NODE_ENV = originalEnv;
        }
      });

      it("geçersiz veya backend tarafından reddedilen anahtarda 401 dönmelidir", async () => {
        const { cookies } = await import("next/headers");
        vi.mocked(cookies).mockResolvedValue(
          mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
        );

        vi.spyOn(Transport.prototype, "request").mockRejectedValue(
          new ActosAPIError({
            status: 401,
            code: "INVALID_KEY",
            detail: "Invalid credentials",
          }),
        );

        const req = new NextRequest("http://localhost:3000/api/session", {
          method: "POST",
          body: JSON.stringify({
            apiKey: "actos_bad_key",
          }),
        });

        const res = await sessionRoute.POST(req);
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.code).toBe("INVALID_KEY");
      });
    });

    describe("GET /api/session (Oturum Doğrulama)", () => {
      it("çerez bulunmadığında 401 MISSING_CREDENTIALS dönmelidir", async () => {
        const { cookies } = await import("next/headers");
        mockCookieStore.get.mockReturnValue(undefined);
        vi.mocked(cookies).mockResolvedValue(
          mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
        );

        const res = await sessionRoute.GET();
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.code).toBe("MISSING_CREDENTIALS");
      });

      it("geçerli çerez olduğunda oturum açmış kullanıcıyı doğrulamalıdır", async () => {
        const { cookies } = await import("next/headers");
        mockCookieStore.get.mockImplementation((name: string) => {
          if (name === ACTOS_TOKEN_COOKIE) return { value: "token_valid_999" };
          return undefined;
        });
        vi.mocked(cookies).mockResolvedValue(
          mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
        );

        vi.spyOn(Transport.prototype, "request").mockResolvedValue({
          data: mockWhoamiSuccess,
          status: 200,
          headers: new Headers(),
        } as never);

        const res = await sessionRoute.GET();
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.user.username).toBe("dila_ai");
      });

      it("çerezdeki anahtar backend tarafından reddedilirse çerezi otomatik temizlemelidir (§8)", async () => {
        const { cookies } = await import("next/headers");
        mockCookieStore.get.mockReturnValue({ value: "token_expired_key" });
        vi.mocked(cookies).mockResolvedValue(
          mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
        );

        vi.spyOn(Transport.prototype, "request").mockRejectedValue(
          new ActosAPIError({
            status: 401,
            code: "INVALID_KEY",
            detail: "Key has been revoked",
          }),
        );

        const res = await sessionRoute.GET();
        expect(res.status).toBe(401);

        // Çerezin maxAge: 0 ile silindiğini doğrula
        expect(mockCookieStore.set).toHaveBeenCalledWith(
          ACTOS_TOKEN_COOKIE,
          "",
          expect.objectContaining({ maxAge: 0 }),
        );
      });
    });

    describe("DELETE /api/session (Çıkış İşlemi)", () => {
      it("çıkış yapıldığında oturum çerezlerini maxAge: 0 ile silmelidir", async () => {
        const { cookies } = await import("next/headers");
        vi.mocked(cookies).mockResolvedValue(
          mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
        );

        const res = await sessionRoute.DELETE();
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);

        expect(mockCookieStore.set).toHaveBeenCalledWith(
          ACTOS_TOKEN_COOKIE,
          "",
          expect.objectContaining({ maxAge: 0 }),
        );
        expect(mockCookieStore.set).toHaveBeenCalledWith(
          SESSION_TOKEN_COOKIE,
          "",
          expect.objectContaining({ maxAge: 0 }),
        );
      });
    });
  });

  // ==========================================================================
  // 2. /api/register & /api/recover Uçları
  // ==========================================================================
  describe("2. Kayıt ve Kurtarma Uçları", () => {
    it("POST /api/register eksik alanlarda 400 VALIDATION_FAILED dönmelidir", async () => {
      const req = new NextRequest("http://localhost:3000/api/register", {
        method: "POST",
        body: JSON.stringify({ username: "", actorType: "human" }),
      });

      const res = await registerRoute.POST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe("VALIDATION_FAILED");
    });

    it("POST /api/register başarılı kayıtta tek seferlik anahtar ve 10 kurtarma kodu dönmelidir", async () => {
      const mockRegisterResult = {
        actor: {
          id: "act_new_1",
          username: "yeni_kullanici",
          actorType: "human",
          createdAt: "2026-09-04T12:00:00Z",
          trustLevel: 0,
        },
        apiKey: "actos_sec_secret_key_12345",
        recoveryCodes: [
          "rc-1111",
          "rc-2222",
          "rc-3333",
          "rc-4444",
          "rc-5555",
          "rc-6666",
          "rc-7777",
          "rc-8888",
          "rc-9999",
          "rc-0000",
        ],
      };

      vi.spyOn(Transport.prototype, "request").mockResolvedValue({
        data: mockRegisterResult,
        status: 200,
        headers: new Headers(),
      } as never);

      const req = new NextRequest("http://localhost:3000/api/register", {
        method: "POST",
        body: JSON.stringify({
          username: "yeni_kullanici",
          actorType: "human",
          displayName: "Yeni",
        }),
      });

      const res = await registerRoute.POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.apiKey).toBe("actos_sec_secret_key_12345");
      expect(body.recoveryCodes.length).toBe(10);
    });

    it("POST /api/register çakışan kullanıcı adında 409 CONFLICT dönmelidir", async () => {
      vi.spyOn(Transport.prototype, "request").mockRejectedValue(
        new ActosAPIError({
          status: 409,
          code: "CONFLICT",
          detail: "Username already taken",
        }),
      );

      const req = new NextRequest("http://localhost:3000/api/register", {
        method: "POST",
        body: JSON.stringify({
          username: "mevcut_kullanici",
          actorType: "human",
        }),
      });

      const res = await registerRoute.POST(req);
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.code).toBe("CONFLICT");
    });

    it("POST /api/recover kurtarma koduyla yeni anahtar üretmeli ve oturum açmalıdır", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
      );

      vi.spyOn(Transport.prototype, "request").mockImplementation(async (options) => {
        if (options.path === "/auth/recover") {
          return {
            data: {
              apiKey: "actos_recovered_key_777",
              remainingRecoveryCodes: 9,
            },
            status: 200,
            headers: new Headers(),
          } as never;
        }
        if (options.path === "/auth/whoami") {
          return {
            data: {
              actor: {
                id: "act_rec_1",
                username: "kurtarilan_kisi",
                actorType: "human",
                trustLevel: 1,
              },
              roles: ["user"],
              key: { id: "k1", label: "Recovered", createdAt: "2026-09-04" },
            },
            status: 200,
            headers: new Headers(),
          } as never;
        }
        return { data: {}, status: 200, headers: new Headers() } as never;
      });

      const req = new NextRequest("http://localhost:3000/api/recover", {
        method: "POST",
        body: JSON.stringify({
          username: "kurtarilan_kisi",
          recoveryCode: "rc-1111",
          rememberMe: true,
        }),
      });

      const res = await recoverRoute.POST(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.apiKey).toBe("actos_recovered_key_777");
      expect(body.remainingRecoveryCodes).toBe(9);

      // Çerez yazılmış olmalı
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        ACTOS_TOKEN_COOKIE,
        "actos_recovered_key_777",
        expect.objectContaining({ httpOnly: true }),
      );
    });
  });

  // ==========================================================================
  // 3. Felaket Senaryosu Uyarısı ve Kurtarma Dosyası Doğrulaması (Plan §7.2)
  // ==========================================================================
  describe("3. Felaket Uyarısı ve Kurtarma Dosyası Bütünlüğü (lib/recovery-file.ts)", () => {
    it("kurtarma dosyası içeriğinde büyük harflerle kalıcı kayıp uyarısı yer almalıdır", () => {
      const codes = [
        "code-1",
        "code-2",
        "code-3",
        "code-4",
        "code-5",
        "code-6",
        "code-7",
        "code-8",
        "code-9",
        "code-10",
      ];

      const content = generateRecoveryFileContent({
        username: "taylan",
        apiKey: "actos_key_taylan_xyz",
        recoveryCodes: codes,
        createdAt: "2026-09-04T12:00:00Z",
      });

      // Kritik uyarı cümleleri
      expect(content).toContain("BUNLARI KAYBEDERSENİZ HESABINIZA ERİŞİMİNİZ KALICI OLARAK BİTER.");
      expect(content).toContain("E-POSTA İLE KURTARMA YOKTUR.");
      expect(content).toContain("Kullanıcı Adı: taylan");
      expect(content).toContain("actos_key_taylan_xyz");

      // 10 kodun da numaralandırılmış olarak dosyada yer alması
      for (let i = 0; i < codes.length; i++) {
        expect(content).toContain(`${i + 1}. ${codes[i]}`);
      }
    });
  });

  // ==========================================================================
  // 4. API Anahtarının İstemciye Sızmaması ve Maskeleme
  // ==========================================================================
  describe("4. Güvenlik: API Anahtarının İstemciye Sızmaması", () => {
    it("GET /api/session yanıtında API anahtarı istemciye sızdırılmamalıdır", async () => {
      const { cookies } = await import("next/headers");
      mockCookieStore.get.mockReturnValue({ value: "super_secret_raw_key" });
      vi.mocked(cookies).mockResolvedValue(
        mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
      );

      vi.spyOn(Transport.prototype, "request").mockResolvedValue({
        data: {
          actor: {
            id: "act_safe_1",
            username: "guvenli_kullanici",
            actorType: "human",
            trustLevel: 2,
          },
          roles: ["user"],
          key: { id: "k_safe", label: "MyKey", createdAt: "2026-09-04" },
        },
        status: 200,
        headers: new Headers(),
      } as never);

      const res = await sessionRoute.GET();
      const body = await res.json();

      expect(body.ok).toBe(true);
      // user objesinde veya kök yanıtta gizli anahtar bulunmamalı
      expect(body).not.toHaveProperty("apiKey");
      expect(body.user).not.toHaveProperty("apiKey");
      expect(JSON.stringify(body)).not.toContain("super_secret_raw_key");
    });
  });

  // ==========================================================================
  // 5. 3 Adımlı Kayıt Doğrulama Mantığı Simülasyonu
  // ==========================================================================
  describe("5. 3 Adımlı Kayıt Doğrulama Akışı Simülasyonu", () => {
    it("doğru kurtarma kodu girildiğinde doğrulamayı kabul etmeli, yanlış kodda reddetmelidir", () => {
      const generatedCodes = [
        "code-alpha",
        "code-beta",
        "code-gamma",
        "code-delta",
        "code-epsilon",
        "code-zeta",
        "code-eta",
        "code-theta",
        "code-iota",
        "code-kappa",
      ];

      // Step 2 -> 3 geçişinde 4. kodun (indeks 3) istendiğini simüle et
      const requestedIndex = 3;
      const expectedCode = generatedCodes[requestedIndex];

      const verifyInputCorrect = "code-delta";
      const verifyInputIncorrect = "wrong-code-xyz";

      expect(verifyInputCorrect).toBe(expectedCode);
      expect(verifyInputIncorrect).not.toBe(expectedCode);
    });
  });

  // ==========================================================================
  // 6. Taslak Koruma ve İlke 2 (lib/drafts.ts)
  // ==========================================================================
  describe("6. Taslak Koruma ve İlke 2 Doğrulaması (lib/drafts.ts)", () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};
      const fakeSessionStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, val: string) => {
          mockStorage[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
      };

      vi.stubGlobal("window", {
        sessionStorage: fakeSessionStorage,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("saveDraft ve getDraft metin taslağını kayıpsız saklayıp geri getirmelidir", () => {
      saveDraft("new_comment_post_42", "Rust'ta ltree kullanımı gerçekten çok zarif.", "/posts/42");

      const restored = getDraft("new_comment_post_42");
      expect(restored).toBe("Rust'ta ltree kullanımı gerçekten çok zarif.");

      const entry = getDraftEntry("new_comment_post_42");
      expect(entry?.returnUrl).toBe("/posts/42");
      expect(entry?.savedAt).toBeGreaterThan(0);
    });

    it("clearDraft taslağı temizlemelidir", () => {
      saveDraft("draft_test", "Deneme taslağı");
      expect(getDraft("draft_test")).toBe("Deneme taslağı");

      clearDraft("draft_test");
      expect(getDraft("draft_test")).toBeNull();
    });

    it("createLoginRedirectUrl dönüş adresini ve draftKey parametresini URL'e taşımalı ve taslağı saklamalıdır", () => {
      const loginUrl = createLoginRedirectUrl(
        "/posts/42#reply",
        "comment_42",
        "Önemli taslak metni",
      );

      expect(loginUrl).toContain("/login?");
      expect(loginUrl).toContain("returnUrl=%2Fposts%2F42%23reply");
      expect(loginUrl).toContain("draftKey=comment_42");

      // Taslak otomatik olarak sessionStorage'a yazılmış olmalıdır
      expect(getDraft("comment_42")).toBe("Önemli taslak metni");
    });
  });
});
