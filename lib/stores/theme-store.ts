import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_THEME, isValidTheme, type ThemeName } from "@/lib/themes";

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

export function syncThemeToDom(theme: ThemeName): void {
  if (typeof window === "undefined") {
    return;
  }

  // LocalStorage senkronizasyonu
  try {
    if (typeof localStorage !== "undefined" && localStorage.setItem) {
      localStorage.setItem("theme", theme);
    }
  } catch {
    // LocalStorage devre dışı veya kota dolu olabilir
  }

  // Cookie senkronizasyonu (1 yıl ömürlü, SameSite=Lax, SSR FOUC önleme)
  try {
    if (typeof document !== "undefined") {
      document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch {
    // Cookie erişim hatası
  }

  // DOM data-theme attribute senkronizasyonu
  try {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch {
    // DOM erişim hatası
  }
}

// Güvenli ve hata fırlatmayan Storage adaptörü
const safeStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(name) : null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(name, value);
      }
    } catch {
      // sessizce yut
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(name);
      }
    } catch {
      // sessizce yut
    }
  },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme: ThemeName) => {
        if (!isValidTheme(theme)) {
          return;
        }
        syncThemeToDom(theme);
        set({ theme });
      },
    }),
    {
      name: "actos-theme-storage",
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.theme && isValidTheme(state.theme)) {
          syncThemeToDom(state.theme);
        }
      },
    },
  ),
);
