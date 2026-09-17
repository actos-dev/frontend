import fs from "node:fs";
import path from "node:path";
import { Actos, ActosAPIError, APITimeoutError } from "actos";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as followRoute from "@/app/api/actions/follow/route";
import * as reportRoute from "@/app/api/actions/report/route";
import * as saveRoute from "@/app/api/actions/save/route";
import * as voteRoute from "@/app/api/actions/vote/route";
import { ACTOS_TOKEN_COOKIE, getAnonymousClient, getServerClient } from "@/lib/actos";
import {
  ACTOS_ERROR_CODES,
  apiErrorResponse,
  isActosErrorCode,
  mapErrorCodeToMessage,
} from "@/lib/errors";
import { t } from "@/lib/i18n";
import { buildCursorUrl, getCursorFromUrl } from "@/lib/pagination";

// Mock next/headers
vi.mock("next/headers", () => {
  return {
    cookies: vi.fn(),
  };
});

describe("Faz 4 — Veri Katmanı ve i18n Altyapısı", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Actos Node SDK Server Entegrasyonu (lib/actos.ts)
  // --------------------------------------------------------------------------
  describe("1. Actos Node SDK Entegrasyonu (lib/actos.ts)", () => {
    it("çerez bulunmadığında anonim istemci üretmelidir", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const client = await getServerClient();
      expect(client).toBeInstanceOf(Actos);
      expect(client.transport.apiKey).toBeNull();
    });

    it("actos_token çerezi olduğunda yetkili istemci üretmelidir", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockImplementation((name: string) => {
          if (name === ACTOS_TOKEN_COOKIE) return { value: "token_actos_123" };
          return undefined;
        }),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const client = await getServerClient();
      expect(client).toBeInstanceOf(Actos);
      expect(client.transport.apiKey).toBe("token_actos_123");
    });

    it("legacy session_token çerezini kimlik bilgisi olarak kullanmamalıdır", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockImplementation((name: string) => {
          if (name === "session_token") return { value: "legacy_token_xyz" };
          return undefined;
        }),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      const client = await getServerClient();
      expect(client).toBeInstanceOf(Actos);
      expect(client.transport.apiKey).toBeNull();
    });

    it("özel apiKey parametresi ile istemci ezilebilmelidir", async () => {
      const client = await getServerClient("custom_api_key_456");
      expect(client).toBeInstanceOf(Actos);
      expect(client.transport.apiKey).toBe("custom_api_key_456");
    });

    it("getAnonymousClient doğrudan kimliksiz istemci dönmelidir", () => {
      const client = getAnonymousClient();
      expect(client).toBeInstanceOf(Actos);
      expect(client.transport.apiKey).toBeNull();
    });

    it("cookies() fonksiyonu hata fırlattığında güvenli şekilde anonim istemciye dönmelidir", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockRejectedValue(new Error("Called outside request context"));

      const client = await getServerClient();
      expect(client).toBeInstanceOf(Actos);
      expect(client.transport.apiKey).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Çeviri Sözlüklerinin Simetrisi ve Eksiksizliği (en.json vs tr.json)
  // --------------------------------------------------------------------------
  describe("2. i18n Sözlükleri Simetri ve Bütünlük Doğrulaması", () => {
    function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      const result: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          result.push(...flattenKeys(value as Record<string, unknown>, fullKey));
        } else {
          result.push(fullKey);
        }
      }
      return result;
    }

    const enRaw = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "messages/en.json"), "utf-8"),
    );
    const trRaw = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "messages/tr.json"), "utf-8"),
    );

    it("en.json ve tr.json anahtarları birebir simetrik olmalıdır", () => {
      const enKeys = flattenKeys(enRaw).sort();
      const trKeys = flattenKeys(trRaw).sort();

      const missingInTr = enKeys.filter((k) => !trKeys.includes(k));
      const missingInEn = trKeys.filter((k) => !enKeys.includes(k));

      expect(missingInTr).toEqual([]);
      expect(missingInEn).toEqual([]);
      expect(enKeys.length).toBe(trKeys.length);
      expect(enKeys.length).toBeGreaterThan(50);
    });

    it("tüm zorunlu üst düzey alanları içermelidir (nav, common, errors, actor, feed, empty)", () => {
      const requiredNamespaces = ["app", "nav", "common", "errors", "actor", "feed", "empty"];
      for (const ns of requiredNamespaces) {
        expect(enRaw).toHaveProperty(ns);
        expect(trRaw).toHaveProperty(ns);
      }
    });

    it("hiçbir çeviri boş string olmamalıdır", () => {
      const enKeys = flattenKeys(enRaw);
      for (const key of enKeys) {
        const enVal = t(key, undefined, "en");
        const trVal = t(key, undefined, "tr");
        expect(enVal.trim()).not.toBe("");
        expect(trVal.trim()).not.toBe("");
        expect(enVal).not.toBe(key);
        expect(trVal).not.toBe(key);
      }
    });

    it("t() fonksiyonu parametre interpolasyonunu doğru yapmalıdır", () => {
      // Test dynamic interpolation
      expect(t("common.save", undefined, "en")).toBe("Save");
      expect(t("common.save", undefined, "tr")).toBe("Kaydet");
    });
  });

  // --------------------------------------------------------------------------
  // 3. 12 Actos Hata Kodunun Eşlenmesi ve RFC 9457 Yanıtı (lib/errors.ts)
  // --------------------------------------------------------------------------
  describe("3. RFC 9457 Hata Dönüşümü (lib/errors.ts)", () => {
    it("12 hata kodunun tamamını listelemelidir", () => {
      expect(ACTOS_ERROR_CODES.length).toBe(12);
      expect(ACTOS_ERROR_CODES).toEqual([
        "VALIDATION_FAILED",
        "INVALID_CURSOR",
        "MISSING_CREDENTIALS",
        "INVALID_KEY",
        "FORBIDDEN",
        "BANNED",
        "NOT_FOUND",
        "CONFLICT",
        "GONE",
        "UNSUPPORTED_MEDIA",
        "RATE_LIMITED",
        "INTERNAL",
      ]);
    });

    it("12 hata kodunun tamamı için İngilizce ve Türkçe karşılıklar üretilmelidir", () => {
      for (const code of ACTOS_ERROR_CODES) {
        expect(isActosErrorCode(code)).toBe(true);

        const enMsg = mapErrorCodeToMessage(code, "en");
        const trMsg = mapErrorCodeToMessage(code, "tr");

        expect(enMsg).toBeTruthy();
        expect(trMsg).toBeTruthy();
        expect(enMsg).not.toBe(`errors.${code}`);
        expect(trMsg).not.toBe(`errors.${code}`);
        // İki dil birbirinden farklı metin dönmelidir
        expect(enMsg).not.toBe(trMsg);
      }
    });

    it("bilinmeyen veya boş hata kodlarında fallback hata mesajı dönmelidir", () => {
      const enUnknown = mapErrorCodeToMessage("NON_EXISTENT_ERROR_CODE", "en");
      const trUnknown = mapErrorCodeToMessage("NON_EXISTENT_ERROR_CODE", "tr");

      expect(enUnknown).toBe("An unexpected error occurred.");
      expect(trUnknown).toBe("Beklenmeyen bir hata oluştu.");

      const enNull = mapErrorCodeToMessage(null, "en");
      expect(enNull).toBe("An unexpected error occurred.");
    });

    it("apiErrorResponse RFC 9457 uyumlu Problem Details ve Cache-Control: private başlığı üretmelidir", async () => {
      const error = new ActosAPIError({
        status: 404,
        code: "NOT_FOUND",
        detail: "Raw internal database record not found details",
        requestId: "req_test_12345",
      });

      const response = apiErrorResponse(error, { locale: "tr" });
      expect(response.status).toBe(404);

      // Cache-Control: private kontrolü
      const cacheControl = response.headers.get("Cache-Control");
      expect(cacheControl).toContain("private");
      expect(cacheControl).toContain("no-store");

      const body = await response.json();
      expect(body.status).toBe(404);
      expect(body.code).toBe("NOT_FOUND");
      expect(body.requestId).toBe("req_test_12345");
      // Plan §8 kuralı: sunucunun ham detayı gösterilmez, yerelleştirilmiş mesaj döner
      expect(body.detail).toBe("Aradığınız içerik veya kaynak bulunamadı.");
      expect(body.detail).not.toBe("Raw internal database record not found details");
    });

    it("APITimeoutError 408 ve TIMEOUT_ERROR olarak paketlenmelidir", async () => {
      const timeoutErr = new APITimeoutError("Operation timed out");
      const res = apiErrorResponse(timeoutErr, { locale: "en" });
      expect(res.status).toBe(408);

      const body = await res.json();
      expect(body.code).toBe("TIMEOUT_ERROR");
      expect(body.detail).toBe("The request timed out. Please try again.");
    });
  });

  // --------------------------------------------------------------------------
  // 4. /api/actions/* Route Handler İskeleti ve Cache-Control Kontrolü
  // --------------------------------------------------------------------------
  describe("4. /api/actions/* Route Handler'ları ve Güvenlik Başlıkları", () => {
    let mockClient: {
      votes: { set: ReturnType<typeof vi.fn> };
      saves: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
      actors: { follow: ReturnType<typeof vi.fn>; unfollow: ReturnType<typeof vi.fn> };
      reports: { create: ReturnType<typeof vi.fn> };
    };

    beforeEach(async () => {
      mockClient = {
        votes: {
          set: vi.fn().mockResolvedValue({ score: 10, upvotes: 12, downvotes: 2, value: 1 }),
        },
        saves: {
          add: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined),
        },
        actors: {
          follow: vi.fn().mockResolvedValue(undefined),
          unfollow: vi.fn().mockResolvedValue(undefined),
        },
        reports: {
          create: vi.fn().mockResolvedValue({
            id: "rep_123",
            targetType: "post",
            targetId: "c_post_1",
            reason: "spam",
          }),
        },
      };

      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "test_token" }),
      } as unknown as Awaited<ReturnType<typeof cookies>>);

      // Spy on getServerClient to return mockClient
      vi.spyOn(await import("@/lib/actos"), "getServerClient").mockResolvedValue(
        mockClient as unknown as Actos,
      );
    });

    describe("POST /api/actions/vote", () => {
      it("geçersiz parametrelerde 400 ve private cache-control dönmelidir", async () => {
        const req = new NextRequest("http://localhost:3000/api/actions/vote", {
          method: "POST",
          body: JSON.stringify({ contentId: "", value: 5 }),
        });

        const res = await voteRoute.POST(req);
        expect(res.status).toBe(400);
        expect(res.headers.get("Cache-Control")).toContain("private");
      });

      it("geçerli oy isteğinde SDK'yı çağırmalı ve private cache-control ile 200 dönmelidir", async () => {
        const req = new NextRequest("http://localhost:3000/api/actions/vote", {
          method: "POST",
          body: JSON.stringify({ contentId: "c_post_123", value: 1 }),
        });

        const res = await voteRoute.POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toContain("private");
        expect(res.headers.get("Cache-Control")).toContain("no-store");

        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(mockClient.votes.set).toHaveBeenCalledWith("c_post_123", 1);
      });
    });

    describe("POST & DELETE /api/actions/save", () => {
      it("kaydetme isteğinde SDK saves.add çağırmalı ve private cache-control dönmelidir", async () => {
        const req = new NextRequest("http://localhost:3000/api/actions/save", {
          method: "POST",
          body: JSON.stringify({ contentId: "c_post_456", action: "add" }),
        });

        const res = await saveRoute.POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toContain("private");

        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.saved).toBe(true);
        expect(mockClient.saves.add).toHaveBeenCalledWith("c_post_456");
      });

      it("kaydı kaldırma isteğinde SDK saves.remove çağırmalıdır", async () => {
        const req = new NextRequest("http://localhost:3000/api/actions/save", {
          method: "POST",
          body: JSON.stringify({ contentId: "c_post_456", action: "remove" }),
        });

        const res = await saveRoute.POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toContain("private");

        const data = await res.json();
        expect(data.saved).toBe(false);
        expect(mockClient.saves.remove).toHaveBeenCalledWith("c_post_456");
      });
    });

    describe("POST & DELETE /api/actions/follow", () => {
      it("takip isteğinde SDK actors.follow çağırmalı ve private cache-control dönmelidir", async () => {
        const req = new NextRequest("http://localhost:3000/api/actions/follow", {
          method: "POST",
          body: JSON.stringify({ username: "alice_ai", action: "follow" }),
        });

        const res = await followRoute.POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toContain("private");

        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(data.following).toBe(true);
        expect(mockClient.actors.follow).toHaveBeenCalledWith("alice_ai");
      });

      it("takibi bırakma isteğinde SDK actors.unfollow çağırmalıdır", async () => {
        const req = new NextRequest("http://localhost:3000/api/actions/follow", {
          method: "POST",
          body: JSON.stringify({ username: "alice_ai", action: "unfollow" }),
        });

        const res = await followRoute.POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toContain("private");

        const data = await res.json();
        expect(data.following).toBe(false);
        expect(mockClient.actors.unfollow).toHaveBeenCalledWith("alice_ai");
      });
    });

    describe("POST /api/actions/report", () => {
      it("şikayet eksik veride 400 ve private cache-control dönmelidir", async () => {
        const req = new NextRequest("http://localhost:3000/api/actions/report", {
          method: "POST",
          body: JSON.stringify({ targetId: "c_123" }), // eksik reason
        });

        const res = await reportRoute.POST(req);
        expect(res.status).toBe(400);
        expect(res.headers.get("Cache-Control")).toContain("private");
      });

      it("geçerli şikayet oluşturulduğunda 201 ve private cache-control dönmelidir", async () => {
        const req = new NextRequest("http://localhost:3000/api/actions/report", {
          method: "POST",
          body: JSON.stringify({
            targetType: "post",
            targetId: "c_post_1",
            reason: "spam content",
          }),
        });

        const res = await reportRoute.POST(req);
        expect(res.status).toBe(201);
        expect(res.headers.get("Cache-Control")).toContain("private");

        const data = await res.json();
        expect(data.ok).toBe(true);
        expect(mockClient.reports.create).toHaveBeenCalledWith({
          targetType: "post",
          targetId: "c_post_1",
          reason: "spam content",
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // 5. Sayfalama Yardımcısı (lib/pagination.ts)
  // --------------------------------------------------------------------------
  describe("5. Sayfalama Yardımcısı (lib/pagination.ts)", () => {
    it("getCursorFromUrl farklı giriş biçimlerinden cursor parametresini ayıklamalıdır", () => {
      expect(getCursorFromUrl("http://localhost:3000/feed?cursor=cur_abc123")).toBe("cur_abc123");
      expect(getCursorFromUrl("/posts?cursor=cur_xyz")).toBe("cur_xyz");

      const params = new URLSearchParams("sort=hot&cursor=cur_456");
      expect(getCursorFromUrl(params)).toBe("cur_456");

      expect(getCursorFromUrl({ cursor: "cur_obj789" })).toBe("cur_obj789");
      expect(getCursorFromUrl({ cursor: ["cur_arr"] })).toBe("cur_arr");
      expect(getCursorFromUrl("/posts")).toBeNull();
      expect(getCursorFromUrl(null)).toBeNull();
    });

    it("buildCursorUrl URL'i doğru cursor değeriyle oluşturmalı ve temizlemelidir", () => {
      const urlWithCursor = buildCursorUrl("/feed", "sort=hot", "cur_next_99");
      expect(urlWithCursor).toBe("/feed?sort=hot&cursor=cur_next_99");

      const clearedUrl = buildCursorUrl("/feed", "sort=hot&cursor=cur_old", null);
      expect(clearedUrl).toBe("/feed?sort=hot");

      const purePath = buildCursorUrl("/feed", null, null);
      expect(purePath).toBe("/feed");
    });
  });
});
