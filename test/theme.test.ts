// @vitest-environment happy-dom

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { syncThemeToDom, useThemeStore } from "@/lib/stores/theme-store";
import {
  DEFAULT_THEME,
  getTheme,
  isValidTheme,
  OTHER_THEMES,
  PRIMARY_THEME_IDS,
  PRIMARY_THEMES,
  THEME_LIST,
  type ThemeName,
  themes,
} from "@/lib/themes";

// Mock storage
const storageMap = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() {
    return storageMap.size;
  },
};

Object.defineProperty(window, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});

describe("Faz 1 — Tema Sistemi", () => {
  beforeEach(() => {
    storageMap.clear();
    document.cookie = "";
    document.documentElement.removeAttribute("data-theme");
    useThemeStore.setState({ theme: DEFAULT_THEME });
  });

  describe("1. Tema Listesi ve Yapılandırma Doğrulaması", () => {
    it("toplam tam 22 tema tanımlı olmalıdır", () => {
      expect(THEME_LIST).toHaveLength(22);
      expect(Object.keys(themes)).toHaveLength(22);
    });

    it("varsayılan tema 'sepia' olmalıdır", () => {
      expect(DEFAULT_THEME).toBe("sepia");
      expect(themes.sepia).toBeDefined();
      expect(themes.sepia.name).toBe("Sepya");
    });

    it("ana üçlü (primary trio) tam olarak sepia, light ve florence olmalıdır", () => {
      expect(PRIMARY_THEMES).toHaveLength(3);
      expect(PRIMARY_THEME_IDS).toEqual(["sepia", "light", "florence"]);

      const primaryIds = PRIMARY_THEMES.map((t) => t.id);
      expect(primaryIds).toContain("sepia");
      expect(primaryIds).toContain("light");
      expect(primaryIds).toContain("florence");

      for (const t of PRIMARY_THEMES) {
        expect(t.group).toBe("primary");
      }
    });

    it("kalan temalar ('daha fazla') tam 19 adet olmalıdır", () => {
      expect(OTHER_THEMES).toHaveLength(19);
      for (const t of OTHER_THEMES) {
        expect(t.group).toBe("other");
      }
    });

    it("isValidTheme doğru sonuçlar üretmelidir", () => {
      expect(isValidTheme("sepia")).toBe(true);
      expect(isValidTheme("light")).toBe(true);
      expect(isValidTheme("florence")).toBe(true);
      expect(isValidTheme("ocean")).toBe(true);
      expect(isValidTheme("non-existent-theme")).toBe(false);
      expect(isValidTheme("")).toBe(false);
    });

    it("getTheme bilinmeyen temalarda varsayılan sepia'ya dönmelidir", () => {
      expect(getTheme("sepia").id).toBe("sepia");
      expect(getTheme("ocean").id).toBe("ocean");
      expect(getTheme("random-theme").id).toBe("sepia");
    });

    it("her temanın önizleme renkleri eksiksiz tanımlı olmalıdır", () => {
      for (const t of THEME_LIST) {
        expect(t.preview.background).toBeTruthy();
        expect(t.preview.foreground).toBeTruthy();
        expect(t.preview.primary).toBeTruthy();
        expect(t.preview.voteUp).toBeTruthy();
        expect(t.preview.voteDown).toBeTruthy();
        expect(t.preview.flairHuman).toBeTruthy();
        expect(t.preview.flairAgent).toBeTruthy();
        expect(t.preview.flairBot).toBeTruthy();
        expect(t.preview.flairOrg).toBeTruthy();
      }
    });
  });

  describe("2. Çerezsiz Durum ve Sunucu Tarafı Çözümleme Mantığı", () => {
    function resolveServerTheme(cookieValue: string | undefined): ThemeName {
      if (cookieValue && isValidTheme(cookieValue)) {
        return cookieValue;
      }
      return DEFAULT_THEME;
    }

    it("çerez bulunmadığında (undefined) varsayılan tema 'sepia' dönmelidir", () => {
      const resolved = resolveServerTheme(undefined);
      expect(resolved).toBe("sepia");
    });

    it("çerez boş olduğunda varsayılan tema 'sepia' dönmelidir", () => {
      const resolved = resolveServerTheme("");
      expect(resolved).toBe("sepia");
    });

    it("çerez geçersiz bir isim taşıdığında varsayılan tema 'sepia' dönmelidir", () => {
      const resolved = resolveServerTheme("unknown-theme-xyz");
      expect(resolved).toBe("sepia");
    });

    it("çerez geçerli bir tema taşıdığında o tema dönmelidir", () => {
      expect(resolveServerTheme("florence")).toBe("florence");
      expect(resolveServerTheme("ocean")).toBe("ocean");
      expect(resolveServerTheme("light")).toBe("light");
    });
  });

  describe("3. Zustand Theme Store ve İstemci Senkronizasyonu", () => {
    it("başlangıçta store varsayılan temada olmalıdır", () => {
      const state = useThemeStore.getState();
      expect(state.theme).toBe("sepia");
    });

    it("setTheme çağrıldığında store, DOM, localStorage ve cookie güncellenmelidir", () => {
      const { setTheme } = useThemeStore.getState();

      setTheme("ocean");

      // 1. Store state kontrolü
      expect(useThemeStore.getState().theme).toBe("ocean");

      // 2. DOM attribute kontrolü
      expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");

      // 3. LocalStorage kontrolü
      expect(localStorage.getItem("theme")).toBe("ocean");

      // 4. Cookie kontrolü
      expect(document.cookie).toContain("theme=ocean");
    });

    it("geçersiz bir tema ile setTheme çağrıldığında durum bozulmamalıdır", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("florence");
      expect(useThemeStore.getState().theme).toBe("florence");

      // Geçersiz tema verme denemesi (type casting ile)
      setTheme("invalid-theme" as ThemeName);

      expect(useThemeStore.getState().theme).toBe("florence");
      expect(document.documentElement.getAttribute("data-theme")).toBe("florence");
    });

    it("syncThemeToDom doğrudan çağrıldığında tüm hedefleri senkronize etmelidir", () => {
      syncThemeToDom("emerald");

      expect(document.documentElement.getAttribute("data-theme")).toBe("emerald");
      expect(localStorage.getItem("theme")).toBe("emerald");
      expect(document.cookie).toContain("theme=emerald");
    });
  });

  describe("4. CSS Token Sözleşmesi Doğrulaması", () => {
    const themesDir = path.resolve(process.cwd(), "styles/themes");

    it("22 temanın tüm CSS dosyaları ve base.css mevcut olmalıdır", () => {
      expect(fs.existsSync(path.join(themesDir, "base.css"))).toBe(true);
      expect(fs.existsSync(path.join(themesDir, "index.css"))).toBe(true);

      for (const t of THEME_LIST) {
        const file = path.join(themesDir, `${t.id}.css`);
        expect(fs.existsSync(file), `Dosya bulunamadı: ${t.id}.css`).toBe(true);
      }
    });

    it("hiçbir CSS dosyasında chart-1..5 token'ları bulunmamalıdır", () => {
      const files = fs.readdirSync(themesDir).filter((f) => f.endsWith(".css"));
      for (const file of files) {
        const content = fs.readFileSync(path.join(themesDir, file), "utf8");
        expect(content.includes("--chart-"), `${file} dosyası --chart- içeriyor!`).toBe(false);
      }
    });

    it("her tema dosyasında --vote-up, --vote-down ve 4 flair token'ı tanımlı olmalıdır", () => {
      for (const t of THEME_LIST) {
        const content = fs.readFileSync(path.join(themesDir, `${t.id}.css`), "utf8");
        expect(content).toContain("--vote-up:");
        expect(content).toContain("--vote-down:");
        expect(content).toContain("--flair-human:");
        expect(content).toContain("--flair-agent:");
        expect(content).toContain("--flair-bot:");
        expect(content).toContain("--flair-org:");
      }
    });
  });
});
