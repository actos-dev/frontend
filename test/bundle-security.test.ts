import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FORBIDDEN_PATTERNS, scanClientBundle } from "../scripts/verify-client-bundle";

describe("Faz 18 — İstemci Paketinde Sır Taraması (Secret Leak Scan)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("1. Kural ve Regex Tanımları Doğrulaması", () => {
    it("gerekli tüm hassas desenleri içermelidir", () => {
      const patternNames = FORBIDDEN_PATTERNS.map((p) => p.name);
      expect(patternNames.some((n) => n.includes("ACTOS_API_KEY"))).toBe(true);
      expect(patternNames.some((n) => n.includes("ACTOS_ADMIN_TOKEN"))).toBe(true);
      expect(patternNames.some((n) => n.includes("ACTOS_TOKEN_SECRET"))).toBe(true);
      expect(patternNames.some((n) => n.includes("SESSION_SECRET"))).toBe(true);
      expect(patternNames.some((n) => n.includes("DATABASE_URL"))).toBe(true);
      expect(patternNames.some((n) => n.includes("POSTGRES_PASSWORD"))).toBe(true);
      expect(patternNames.some((n) => n.includes("MINIO_SECRET_KEY"))).toBe(true);
      expect(patternNames.some((n) => n.includes("Hardcoded API Key"))).toBe(true);
      expect(patternNames.some((n) => n.includes("Private Key PEM"))).toBe(true);
      expect(patternNames.some((n) => n.includes("ACTOS_TOKEN_COOKIE"))).toBe(true);
    });
  });

  describe("2. Temiz ve Güvenli Paket Kontrolü", () => {
    it("temiz javascript dosyalarında ihlal bulmamalıdır", () => {
      const safeJs = `
        function renderHeader() {
          console.log("Welcome to Actos Social Web Client");
          return "<div>Actos</div>";
        }
      `;
      fs.writeFileSync(path.join(tempDir, "chunk-1.js"), safeJs, "utf-8");

      const result = scanClientBundle(tempDir);
      expect(result.clean).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.scannedFiles).toBe(1);
      expect(result.totalBytes).toBeGreaterThan(0);
    });

    it("gerçek .next/static build çıktısı mevcutsa taranmalı ve 0 ihlal ile geçmelidir", () => {
      const staticDir = path.resolve(process.cwd(), ".next/static");
      if (fs.existsSync(staticDir)) {
        const result = scanClientBundle(staticDir);
        expect(result.clean).toBe(true);
        expect(result.violations).toHaveLength(0);
        expect(result.scannedFiles).toBeGreaterThan(0);
      }
    });
  });

  describe("3. Sır ve İhlal Yakalama Yeteneği (Plan §Faz 18)", () => {
    it("ACTOS_API_KEY tespit edildiğinde ihlal olarak işaretlemelidir", () => {
      const leakedJs = `
        const config = {
          apiKey: process.env.ACTOS_API_KEY,
        };
      `;
      fs.writeFileSync(path.join(tempDir, "leaked-env.js"), leakedJs, "utf-8");

      const result = scanClientBundle(tempDir);
      expect(result.clean).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(1);
      expect(result.violations.some((v) => v.pattern.includes("ACTOS_API_KEY"))).toBe(true);
    });

    it("hardcoded token veya API key deseni (ak_..., actos_..., sk_...) tespit edildiğinde ihlal yakalamalıdır", () => {
      const leakedTokenJs = `
        const client = initClient("ak_abcdef0123456789abcdef0123456789");
      `;
      fs.writeFileSync(path.join(tempDir, "leaked-token.js"), leakedTokenJs, "utf-8");

      const result = scanClientBundle(tempDir);
      expect(result.clean).toBe(false);
      expect(result.violations.some((v) => v.pattern.includes("Hardcoded API Key"))).toBe(true);
    });

    it("ACTOS_ADMIN_TOKEN veya DATABASE_URL sızıntılarını tespit etmelidir", () => {
      const leakedSecretsJs = `
        const admin = "ACTOS_ADMIN_TOKEN";
        const db = "DATABASE_URL";
      `;
      fs.writeFileSync(path.join(tempDir, "leaked-secrets.js"), leakedSecretsJs, "utf-8");

      const result = scanClientBundle(tempDir);
      expect(result.clean).toBe(false);
      expect(result.violations.some((v) => v.pattern.includes("ACTOS_ADMIN_TOKEN"))).toBe(true);
      expect(result.violations.some((v) => v.pattern.includes("DATABASE_URL"))).toBe(true);
    });

    it("var olmayan dizin verildiğinde açıklayıcı bir hata fırlatmalıdır", () => {
      const nonExistent = path.join(tempDir, "does-not-exist");
      expect(() => scanClientBundle(nonExistent)).toThrowError(/does not exist/);
    });
  });
});
