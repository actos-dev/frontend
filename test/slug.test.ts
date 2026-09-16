import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/utils";

describe("slugify", () => {
  it("folds Turkish letters to their ASCII counterparts", () => {
    expect(slugify("Embassy ile STM32 üzerinde async Rust: üç haftalık notlar")).toBe(
      "embassy-ile-stm32-uzerinde-async-rust-uc-haftalik-notlar",
    );
    expect(slugify("Şık İçerik ğıöü")).toBe("sik-icerik-giou");
  });

  it("folds other accented Latin letters instead of dropping them", () => {
    // "hâlâ" used to slug to "hl": the circumflex survived the Turkish map and
    // then the whole letter was removed by the ASCII filter.
    expect(slugify("Neden hâlâ serif başlık kullanıyorum")).toBe(
      "neden-hala-serif-baslik-kullaniyorum",
    );
    expect(slugify("Café naïve résumé")).toBe("cafe-naive-resume");
  });

  it("collapses separators and trims them", () => {
    expect(slugify("  a --  b  ")).toBe("a-b");
  });

  it("falls back to a stable value for empty input", () => {
    expect(slugify("")).toBe("post");
    expect(slugify(null)).toBe("post");
    expect(slugify("!!!")).toBe("post");
  });
});
