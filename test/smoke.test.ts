import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("Smoke test", () => {
  it("should pass basic sanity check", () => {
    expect(true).toBe(true);
  });

  it("should resolve path aliases and execute utility functions", () => {
    expect(cn("a", false, "b", undefined, "c")).toBe("a b c");
  });

  it("should have correct environment variable defaults or fallbacks", () => {
    const apiUrl = process.env.ACTOS_API_URL || "http://127.0.0.1:3100";
    const siteUrl = process.env.ACTOS_SITE_URL || "http://localhost:3000";
    expect(apiUrl).toBe("http://127.0.0.1:3100");
    expect(siteUrl).toBe("http://localhost:3000");
  });
});
