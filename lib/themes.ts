export type ThemeMode = "light" | "dark";

export interface ThemePreviewColors {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  accent: string;
  voteUp: string;
  voteDown: string;
  border: string;
  flairHuman: string;
  flairAgent: string;
  flairBot: string;
  flairOrg: string;
}

export interface ThemeDefinition {
  id: ThemeName;
  name: string;
  mode: ThemeMode;
  group: "primary" | "other";
  description: string;
  preview: ThemePreviewColors;
}

export const DEFAULT_THEME = "sepia" as const;

export const PRIMARY_THEME_IDS = ["sepia", "light", "florence"] as const;

export const themes: Record<string, ThemeDefinition> = {
  // Ana Üçlü (Primary Trio)
  sepia: {
    id: "sepia",
    name: "Sepya",
    mode: "light",
    group: "primary",
    description: "Eski kitap ve kâğıt hissi — Actos'un varsayılan marka kimliği",
    preview: {
      background: "#ece1cc",
      foreground: "#3a2f20",
      card: "#f6eed9",
      primary: "#8f5a1e",
      accent: "#4f7a5a",
      voteUp: "#4a8a5c",
      voteDown: "#b35549",
      border: "#d0bf9d",
      flairHuman: "#1d698a",
      flairAgent: "#6d3596",
      flairBot: "#a15c03",
      flairOrg: "#296d44",
    },
  },
  light: {
    id: "light",
    name: "Açık",
    mode: "light",
    group: "primary",
    description: "Nötr, aydınlık ve ferah görünüm",
    preview: {
      background: "#f8fafc",
      foreground: "#0f172a",
      card: "#ffffff",
      primary: "#2563eb",
      accent: "#f59e0b",
      voteUp: "#16a34a",
      voteDown: "#dc2626",
      border: "#e2e8f0",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  florence: {
    id: "florence",
    name: "Florence (Koyu)",
    mode: "dark",
    group: "primary",
    description: "Koyu gece mavisi — birincil karanlık tema",
    preview: {
      background: "#0a0a0f",
      foreground: "#f8fafc",
      card: "#1a1a2e",
      primary: "#2563eb",
      accent: "#f59e0b",
      voteUp: "#22c55e",
      voteDown: "#ef4444",
      border: "#2d2d4a",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },

  // Kalan 19 Tema (Other Themes)
  dark: {
    id: "dark",
    name: "Koyu (Nötr)",
    mode: "dark",
    group: "other",
    description: "Nötr kömür ve siyah tonları",
    preview: {
      background: "#09090b",
      foreground: "#f4f4f5",
      card: "#18181b",
      primary: "#fafafa",
      accent: "#f59e0b",
      voteUp: "#22c55e",
      voteDown: "#ef4444",
      border: "#27272a",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },
  ocean: {
    id: "ocean",
    name: "Okyanus",
    mode: "dark",
    group: "other",
    description: "Derin okyanus mavisi ve turkuaz esintiler",
    preview: {
      background: "#0a0f1a",
      foreground: "#f0f9ff",
      card: "#132338",
      primary: "#06b6d4",
      accent: "#2dd4bf",
      voteUp: "#22c55e",
      voteDown: "#ef4444",
      border: "#1e3a5f",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },
  "ocean-light": {
    id: "ocean-light",
    name: "Okyanus (Açık)",
    mode: "light",
    group: "other",
    description: "Açık turkuaz ve ferah deniz esintisi",
    preview: {
      background: "#edfbfd",
      foreground: "#133844",
      card: "#f4fdfe",
      primary: "#0e7490",
      accent: "#0f8f7a",
      voteUp: "#0f9d58",
      voteDown: "#e11d48",
      border: "#bfe0e8",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  emerald: {
    id: "emerald",
    name: "Zümrüt",
    mode: "dark",
    group: "other",
    description: "Koyu orman ve parıltılı zümrüt tonları",
    preview: {
      background: "#0a0f0f",
      foreground: "#ecfdf5",
      card: "#0f2e22",
      primary: "#10b981",
      accent: "#34d399",
      voteUp: "#22c55e",
      voteDown: "#ef4444",
      border: "#14532d",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },
  "emerald-light": {
    id: "emerald-light",
    name: "Zümrüt (Açık)",
    mode: "light",
    group: "other",
    description: "Taze nane ve zümrüt yeşili aydınlık görünüm",
    preview: {
      background: "#f0fbf5",
      foreground: "#143a29",
      card: "#f7fdfa",
      primary: "#047857",
      accent: "#10b981",
      voteUp: "#16a34a",
      voteDown: "#dc2626",
      border: "#bfe4d4",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  midnight: {
    id: "midnight",
    name: "Geceyarısı",
    mode: "dark",
    group: "other",
    description: "Gizemli derin mor ve gece tonları",
    preview: {
      background: "#0a0a0f",
      foreground: "#faf5ff",
      card: "#1f1035",
      primary: "#7c3aed",
      accent: "#a78bfa",
      voteUp: "#22c55e",
      voteDown: "#ef4444",
      border: "#2e1065",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },
  "midnight-light": {
    id: "midnight-light",
    name: "Geceyarısı (Açık)",
    mode: "light",
    group: "other",
    description: "Zarif açık leylak ve lavanta ışıltısı",
    preview: {
      background: "#f5f4ff",
      foreground: "#2c2452",
      card: "#fbfaff",
      primary: "#7c3aed",
      accent: "#8b5cf6",
      voteUp: "#16a34a",
      voteDown: "#e11d48",
      border: "#d4ccf5",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  sunset: {
    id: "sunset",
    name: "Günbatımı",
    mode: "dark",
    group: "other",
    description: "Sıcak kehribar ve akşam kızıllığı",
    preview: {
      background: "#0f0f0a",
      foreground: "#fffbeb",
      card: "#3a1f05",
      primary: "#f59e0b",
      accent: "#fb923c",
      voteUp: "#22c55e",
      voteDown: "#ef4444",
      border: "#78350f",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },
  "sunset-light": {
    id: "sunset-light",
    name: "Günbatımı (Açık)",
    mode: "light",
    group: "other",
    description: "Sıcak şeftali ve altın güneş tonları",
    preview: {
      background: "#fff7ea",
      foreground: "#452d0d",
      card: "#fffcf5",
      primary: "#c2410c",
      accent: "#ea6a18",
      voteUp: "#16a34a",
      voteDown: "#dc2626",
      border: "#ecd9b5",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  amber: {
    id: "amber",
    name: "Amber",
    mode: "dark",
    group: "other",
    description: "Sıcak bal ve kehribar sarısı",
    preview: {
      background: "#0d0b05",
      foreground: "#fefce8",
      card: "#2e2105",
      primary: "#f59e0b",
      accent: "#fbbf24",
      voteUp: "#84a653",
      voteDown: "#c2410c",
      border: "#5b410c",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },
  "amber-light": {
    id: "amber-light",
    name: "Amber (Açık)",
    mode: "light",
    group: "other",
    description: "Aydınlık sıcak bal sarısı tonlar",
    preview: {
      background: "#fdf8e8",
      foreground: "#43320c",
      card: "#fffdf5",
      primary: "#b45309",
      accent: "#f59e0b",
      voteUp: "#16a34a",
      voteDown: "#dc2626",
      border: "#efdfb4",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  rose: {
    id: "rose",
    name: "Gül",
    mode: "dark",
    group: "other",
    description: "Koyu yakut ve gül kırmızısı",
    preview: {
      background: "#12090d",
      foreground: "#fff1f2",
      card: "#38101e",
      primary: "#be123c",
      accent: "#fb7185",
      voteUp: "#84a653",
      voteDown: "#f43f5e",
      border: "#542033",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },
  "rose-light": {
    id: "rose-light",
    name: "Gül (Açık)",
    mode: "light",
    group: "other",
    description: "Yumuşak pembe ve gül taçyaprağı tonları",
    preview: {
      background: "#fdf3f5",
      foreground: "#441a25",
      card: "#fef9fa",
      primary: "#e11d48",
      accent: "#fb7185",
      voteUp: "#16a34a",
      voteDown: "#be123c",
      border: "#f0c9d2",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  orchid: {
    id: "orchid",
    name: "Orkide",
    mode: "dark",
    group: "other",
    description: "Zengin mor orkide ve pembe vurgular",
    preview: {
      background: "#120d18",
      foreground: "#faf5ff",
      card: "#2f1b3d",
      primary: "#c084fc",
      accent: "#f0abfc",
      voteUp: "#86a95b",
      voteDown: "#e879a5",
      border: "#51366a",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },
  "orchid-light": {
    id: "orchid-light",
    name: "Orkide (Açık)",
    mode: "light",
    group: "other",
    description: "Ferah pastel leylak ve orkide pembe",
    preview: {
      background: "#faf5fe",
      foreground: "#3a2347",
      card: "#fdfaff",
      primary: "#9333ea",
      accent: "#c084fc",
      voteUp: "#16a34a",
      voteDown: "#e11d48",
      border: "#e2c9f0",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  graphite: {
    id: "graphite",
    name: "Grafit",
    mode: "dark",
    group: "other",
    description: "Mat kömür, metalik arduvaz ve teknik gri",
    preview: {
      background: "#0b0d0f",
      foreground: "#f3f4f6",
      card: "#1e2227",
      primary: "#9ca3af",
      accent: "#cbd5e1",
      voteUp: "#22c55e",
      voteDown: "#ef4444",
      border: "#363b43",
      flairHuman: "#38bdf8",
      flairAgent: "#c084fc",
      flairBot: "#fbbf24",
      flairOrg: "#34d399",
    },
  },
  "graphite-light": {
    id: "graphite-light",
    name: "Grafit (Açık)",
    mode: "light",
    group: "other",
    description: "Açık arduvaz gri ve modern teknik sadelik",
    preview: {
      background: "#f5f6f7",
      foreground: "#272a2e",
      card: "#fbfbfc",
      primary: "#52525b",
      accent: "#71717a",
      voteUp: "#15803d",
      voteDown: "#dc2626",
      border: "#d7dade",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  arctic: {
    id: "arctic",
    name: "Arctic",
    mode: "light",
    group: "other",
    description: "Buzul mavisi ve kutup ferahlığı",
    preview: {
      background: "#f1f7fb",
      foreground: "#1c3140",
      card: "#f7fbfe",
      primary: "#0369a1",
      accent: "#14b8a6",
      voteUp: "#15803d",
      voteDown: "#dc2626",
      border: "#c8dce9",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
  "florence-light": {
    id: "florence-light",
    name: "Florence (Açık)",
    mode: "light",
    group: "other",
    description: "Açık kurumsal mavi ve dengeli kontrast",
    preview: {
      background: "#f4f7fc",
      foreground: "#182438",
      card: "#fbfcfe",
      primary: "#2563eb",
      accent: "#f59e0b",
      voteUp: "#16a34a",
      voteDown: "#dc2626",
      border: "#d4dfee",
      flairHuman: "#0284c7",
      flairAgent: "#7c3aed",
      flairBot: "#b45309",
      flairOrg: "#047857",
    },
  },
};

export type ThemeName =
  | "sepia"
  | "light"
  | "florence"
  | "dark"
  | "ocean"
  | "ocean-light"
  | "emerald"
  | "emerald-light"
  | "midnight"
  | "midnight-light"
  | "sunset"
  | "sunset-light"
  | "amber"
  | "amber-light"
  | "rose"
  | "rose-light"
  | "orchid"
  | "orchid-light"
  | "graphite"
  | "graphite-light"
  | "arctic"
  | "florence-light";

export const THEME_LIST: ThemeDefinition[] = Object.values(themes);

export const PRIMARY_THEMES = THEME_LIST.filter((t) => t.group === "primary");
export const OTHER_THEMES = THEME_LIST.filter((t) => t.group === "other");

export function isValidTheme(themeName: string): themeName is ThemeName {
  return Object.hasOwn(themes, themeName);
}

export function getTheme(themeName: string): ThemeDefinition {
  return isValidTheme(themeName) ? themes[themeName] : themes[DEFAULT_THEME];
}
