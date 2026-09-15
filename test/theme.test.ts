// @vitest-environment happy-dom

import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  applyThemeToDom,
  readThemeCookie,
  syncThemeToDom,
  useThemeStore,
} from "@/lib/stores/theme-store";
import {
  DEFAULT_THEME,
  isValidTheme,
  THEME_NAMES,
  type ThemeName,
  themeAttribute,
} from "@/lib/themes";

// happy-dom does not wire up a global localStorage by default; stub one so
// the "never persists to localStorage" test below has something real to
// inspect (the store itself never touches this).
const storageMap = new Map<string, string>();
const mockStorage: Storage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
  get length() {
    return storageMap.size;
  },
};
Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});

describe("Faz 1 — Theme system (F-05)", () => {
  beforeEach(() => {
    storageMap.clear();
    document.cookie = "theme=; path=/; max-age=0";
    document.documentElement.removeAttribute("data-theme");
    useThemeStore.setState({ theme: DEFAULT_THEME });
  });

  describe("1. Theme list", () => {
    it("exposes exactly system, sepia, light and dark", () => {
      expect(THEME_NAMES).toHaveLength(4);
      expect(THEME_NAMES).toEqual(["system", "sepia", "light", "dark"]);
    });

    it("defaults to system", () => {
      expect(DEFAULT_THEME).toBe("system");
    });

    it("isValidTheme accepts only the four theme names", () => {
      expect(isValidTheme("system")).toBe(true);
      expect(isValidTheme("sepia")).toBe(true);
      expect(isValidTheme("light")).toBe(true);
      expect(isValidTheme("dark")).toBe(true);

      expect(isValidTheme("florence")).toBe(false);
      expect(isValidTheme("ocean")).toBe(false);
      expect(isValidTheme("non-existent-theme")).toBe(false);
      expect(isValidTheme("")).toBe(false);
    });
  });

  describe("2. Cookie -> data-theme mapping", () => {
    it("maps sepia, light and dark to their own data-theme attribute", () => {
      expect(themeAttribute("sepia")).toBe("sepia");
      expect(themeAttribute("light")).toBe("light");
      expect(themeAttribute("dark")).toBe("dark");
    });

    it("maps system to undefined, so <html> renders with no data-theme attribute", () => {
      expect(themeAttribute("system")).toBeUndefined();
    });

    it("resolveServerTheme falls back to system for a missing, empty or invalid cookie", () => {
      function resolveServerTheme(cookieValue: string | undefined): ThemeName {
        return cookieValue && isValidTheme(cookieValue) ? cookieValue : DEFAULT_THEME;
      }

      expect(resolveServerTheme(undefined)).toBe("system");
      expect(resolveServerTheme("")).toBe("system");
      expect(resolveServerTheme("unknown-theme-xyz")).toBe("system");
      expect(resolveServerTheme("sepia")).toBe("sepia");
      expect(resolveServerTheme("light")).toBe("light");
      expect(resolveServerTheme("dark")).toBe("dark");
      expect(resolveServerTheme("system")).toBe("system");
    });
  });

  describe("3. DOM sync and cookie handling", () => {
    it("applyThemeToDom sets data-theme for explicit themes", () => {
      applyThemeToDom("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("applyThemeToDom removes data-theme for system", () => {
      document.documentElement.setAttribute("data-theme", "dark");
      applyThemeToDom("system");
      expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    });

    it("syncThemeToDom writes the cookie and the DOM attribute together", () => {
      syncThemeToDom("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.cookie).toContain("theme=light");
    });

    it("readThemeCookie parses the theme cookie and falls back to the default", () => {
      document.cookie = "theme=dark; path=/";
      expect(readThemeCookie()).toBe("dark");

      document.cookie = "theme=; path=/; max-age=0";
      document.cookie = "theme=not-a-theme; path=/";
      expect(readThemeCookie()).toBe(DEFAULT_THEME);
    });
  });

  describe("4. Zustand store", () => {
    it("starts at the default theme", () => {
      expect(useThemeStore.getState().theme).toBe(DEFAULT_THEME);
    });

    it("setTheme updates the store, the DOM and the cookie", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("dark");

      expect(useThemeStore.getState().theme).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.cookie).toContain("theme=dark");
    });

    it("setTheme with system removes the data-theme attribute", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("dark");
      setTheme("system");

      expect(useThemeStore.getState().theme).toBe("system");
      expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
      expect(document.cookie).toContain("theme=system");
    });

    it("rejects an invalid theme without changing state", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("light");
      expect(useThemeStore.getState().theme).toBe("light");

      setTheme("invalid-theme" as ThemeName);

      expect(useThemeStore.getState().theme).toBe("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("never persists to localStorage (the cookie is the single source of truth)", () => {
      const { setTheme } = useThemeStore.getState();
      setTheme("dark");

      expect(localStorage.getItem("theme")).toBeNull();
      expect(localStorage.getItem("actos-theme-storage")).toBeNull();
    });

    it("syncFromCookie reads the cookie without ever writing it (it never overrides the cookie)", () => {
      document.cookie = "theme=dark; path=/";
      const cookieBefore = document.cookie;

      useThemeStore.getState().syncFromCookie();

      expect(useThemeStore.getState().theme).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      // The cookie itself is untouched by a read-only sync.
      expect(document.cookie).toBe(cookieBefore);
    });

    it("fixes the ignored-cookie bug: a dark cookie set before the store loads is honored, not overwritten by a stale default", () => {
      // Simulate the server having rendered <html data-theme="dark"> from an
      // explicit cookie, before any client-side store logic has run.
      document.cookie = "theme=dark; path=/";
      document.documentElement.setAttribute("data-theme", "dark");

      // The store starts at DEFAULT_THEME until it syncs from the cookie —
      // exactly the behavior a fresh module load produces on the client.
      useThemeStore.setState({ theme: DEFAULT_THEME });
      useThemeStore.getState().syncFromCookie();

      expect(useThemeStore.getState().theme).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("5. styles/tokens.css", () => {
    const tokensPath = path.resolve(process.cwd(), "styles/tokens.css");
    const content = fs.readFileSync(tokensPath, "utf8");

    it("exists and no longer lives under styles/themes/", () => {
      expect(fs.existsSync(tokensPath)).toBe(true);
      expect(fs.existsSync(path.resolve(process.cwd(), "styles/themes"))).toBe(false);
    });

    it("defines the core §1.2 tokens for sepia, light and dark", () => {
      for (const selector of [
        '[data-theme="sepia"]',
        '[data-theme="light"]',
        '[data-theme="dark"]',
      ]) {
        expect(content).toContain(selector);
      }
      for (const token of [
        "--bg:",
        "--bg-subtle:",
        "--bg-muted:",
        "--border:",
        "--border-strong:",
        "--fg:",
        "--fg-muted:",
        "--fg-subtle:",
        "--accent:",
        "--accent-text:",
        "--on-accent:",
        "--down:",
        "--danger:",
        "--success:",
        "--warning:",
        "--tint-s:",
        "--tint-l:",
      ]) {
        expect(content).toContain(token);
      }
    });

    it("resolves the system theme through prefers-color-scheme, not a data-theme value", () => {
      expect(content).toContain("prefers-color-scheme: dark");
      expect(content).toContain(":root:not([data-theme])");
    });

    it("no longer defines flair-bot, flair-org or sidebar tokens", () => {
      expect(content).not.toContain("--flair-bot");
      expect(content).not.toContain("--flair-org");
      expect(content).not.toContain("--sidebar");
    });
  });

  describe("6. ThemeSwitcher", () => {
    it("offers exactly the 4 options: system, sepia, light, dark", () => {
      render(React.createElement(ThemeSwitcher));

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(4);

      for (const name of THEME_NAMES) {
        expect(screen.getByRole("button", { name: new RegExp(name, "i") })).toBeDefined();
      }
    });

    it("marks the active theme with aria-pressed", () => {
      useThemeStore.setState({ theme: "dark" });
      render(React.createElement(ThemeSwitcher));

      const darkButton = screen.getByRole("button", { name: /dark/i });
      expect(darkButton.getAttribute("aria-pressed")).toBe("true");

      const lightButton = screen.getByRole("button", { name: /^light$/i });
      expect(lightButton.getAttribute("aria-pressed")).toBe("false");
    });
  });
});
