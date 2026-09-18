import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage } from "@/lib/i18n";

describe("first-visit locale negotiation", () => {
  it.each([
    ["tr-TR,tr;q=0.9,en;q=0.8", "tr"],
    ["en-US,en;q=0.9,tr;q=0.2", "en"],
    ["de-DE,tr;q=0.8,en;q=0.7", "tr"],
    ["tr;q=0,en;q=0.5", "en"],
    [null, "en"],
  ] as const)("maps %s to %s", (header, expected) => {
    expect(localeFromAcceptLanguage(header)).toBe(expected);
  });
});
