// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";
import { readApiJson } from "@/lib/query/http";
import { parseRetryAfterSeconds, rateLimitMessage } from "@/lib/rate-limit";

describe("D-03 — 429 Retry-After presentation", () => {
  beforeEach(() => {
    document.cookie = "actos_locale=tr; path=/";
  });

  it("parses delta-seconds and HTTP-date Retry-After values", () => {
    expect(parseRetryAfterSeconds("40")).toBe(40);
    expect(parseRetryAfterSeconds("")).toBeNull();
    expect(parseRetryAfterSeconds(null)).toBeNull();
    expect(parseRetryAfterSeconds("not-a-date")).toBeNull();

    const future = new Date(Date.now() + 40_000).toUTCString();
    expect(parseRetryAfterSeconds(future)).toBeGreaterThanOrEqual(38);
  });

  it("formats the seconds into the localized message, falling back to the generic one", () => {
    expect(rateLimitMessage(40, "en")).toBe("Slow down. Try again in 40 s");
    expect(rateLimitMessage(40, "tr")).toBe("Yavaşla. 40 saniye sonra tekrar dene");
    expect(rateLimitMessage(null, "en")).toBe(
      "You are performing actions too quickly. Please slow down.",
    );
  });

  it("readApiJson attaches retryAfter and a localized detail from the header", async () => {
    const response = {
      ok: false,
      status: 429,
      headers: { get: (name: string) => (name.toLowerCase() === "retry-after" ? "40" : null) },
      json: async () => ({ ok: false, code: "RATE_LIMITED" }),
    } as unknown as Response;

    await expect(readApiJson(response)).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      retryAfter: 40,
      detail: "Yavaşla. 40 saniye sonra tekrar dene",
    });
  });

  it("readApiJson falls back to the body retryAfter when the header is absent", async () => {
    const response = {
      ok: false,
      status: 429,
      json: async () => ({ ok: false, code: "RATE_LIMITED", retryAfter: 12 }),
    } as unknown as Response;

    await expect(readApiJson(response)).rejects.toMatchObject({
      retryAfter: 12,
      detail: "Yavaşla. 12 saniye sonra tekrar dene",
    });
  });
});
