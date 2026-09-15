import { create } from "zustand";
import { DEFAULT_THEME, isValidTheme, type ThemeName, themeAttribute } from "@/lib/themes";

const THEME_COOKIE_NAME = "theme";
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Reads the `theme` cookie directly. This is the single source of truth for
 * the active theme (ROADMAP F-05): there is no localStorage fallback, so
 * nothing can ever resurrect a stale client-side value over it.
 */
export function readThemeCookie(): ThemeName {
  if (typeof document === "undefined") {
    return DEFAULT_THEME;
  }
  const match = document.cookie.match(/(?:^|;\s*)theme=([^;]+)/);
  const value = match ? decodeURIComponent(match[1]) : undefined;
  return value && isValidTheme(value) ? value : DEFAULT_THEME;
}

function writeThemeCookie(theme: ThemeName): void {
  if (typeof document === "undefined") {
    return;
  }
  try {
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    // Cookies disabled or unavailable; the in-memory store still works for
    // this tab, it just won't survive a reload.
  }
}

/** Applies the resolved theme to <html data-theme>, or removes the attribute for "system". */
export function applyThemeToDom(theme: ThemeName): void {
  if (typeof document === "undefined" || !document.documentElement) {
    return;
  }
  const attr = themeAttribute(theme);
  if (attr) {
    document.documentElement.setAttribute("data-theme", attr);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

/** Writes the cookie and applies the theme to the DOM. Used by setTheme and tests. */
export function syncThemeToDom(theme: ThemeName): void {
  writeThemeCookie(theme);
  applyThemeToDom(theme);
}

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  /**
   * Re-reads the `theme` cookie (never localStorage) into the store and the
   * DOM. It never *writes* the cookie, so it can only ever follow the
   * cookie, not override it. Called once when this module loads on the
   * client, and safe to call again (e.g. after a same-tab cookie change).
   */
  syncFromCookie: () => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: DEFAULT_THEME,
  setTheme: (theme: ThemeName) => {
    if (!isValidTheme(theme)) {
      return;
    }
    syncThemeToDom(theme);
    set({ theme });
  },
  syncFromCookie: () => {
    const theme = readThemeCookie();
    applyThemeToDom(theme);
    set({ theme });
  },
}));

// Read the cookie once, on module load, on the client. There is no
// localStorage persistence to race against, so this is the only thing that
// can set the store's initial theme, and it always agrees with the
// server-rendered <html data-theme> (both come from the same cookie).
if (typeof document !== "undefined") {
  useThemeStore.getState().syncFromCookie();
}
