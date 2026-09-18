import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

describe("production security headers", () => {
  it("sets a per-request nonce CSP and browser hardening headers", () => {
    const first = proxy(new NextRequest("https://actos.com.tr/"));
    const second = proxy(new NextRequest("https://actos.com.tr/posts/c_1"));
    const firstCsp = first.headers.get("content-security-policy") ?? "";
    const secondCsp = second.headers.get("content-security-policy") ?? "";

    expect(firstCsp).toContain("default-src 'self'");
    expect(firstCsp).toContain("frame-ancestors 'none'");
    expect(firstCsp).toMatch(/script-src 'self' 'nonce-[^']+'/);
    expect(secondCsp).not.toBe(firstCsp);
    expect(first.headers.get("x-content-type-options")).toBe("nosniff");
    expect(first.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(first.headers.get("x-frame-options")).toBe("DENY");
    expect(first.headers.get("permissions-policy")).toContain("camera=()");
  });

  it("disables the framework identification header", () => {
    const config = fs.readFileSync(path.resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("poweredByHeader: false");
  });

  it("rejects cross-site mutations but keeps non-browser API clients working", async () => {
    const crossSite = proxy(
      new NextRequest("https://actos.com.tr/api/actions/vote", {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    );
    const sameOrigin = proxy(
      new NextRequest("https://actos.com.tr/api/actions/vote", {
        method: "POST",
        headers: {
          origin: "https://actos.com.tr",
          "sec-fetch-site": "same-origin",
        },
      }),
    );
    const apiClient = proxy(
      new NextRequest("https://actos.com.tr/api/actions/vote", { method: "POST" }),
    );

    expect(crossSite.status).toBe(403);
    expect(await crossSite.json()).toMatchObject({ code: "CROSS_SITE_REQUEST" });
    expect(sameOrigin.status).toBe(200);
    expect(apiClient.status).toBe(200);
  });

  it("rejects oversized multipart bodies before route parsing", async () => {
    const response = proxy(
      new NextRequest("https://actos.com.tr/api/posts", {
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=test",
          "content-length": String(35 * 1024 * 1024),
          origin: "https://actos.com.tr",
        },
      }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });
});
