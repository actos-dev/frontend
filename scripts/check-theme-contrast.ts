import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * WCAG 2.1 AA Contrast Thresholds
 */
export const WCAG_NORMAL_TEXT_THRESHOLD = 4.5;
export const WCAG_LARGE_TEXT_OR_UI_THRESHOLD = 3.0;

export interface ContrastCheckDefinition {
  name: string;
  foregroundToken: string;
  backgroundToken: string;
  minContrast: number;
  category: "normal-text" | "ui-component";
}

export const CONTRAST_CHECKS: ContrastCheckDefinition[] = [
  {
    name: "foreground / background",
    foregroundToken: "--foreground",
    backgroundToken: "--background",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "card-foreground / card",
    foregroundToken: "--card-foreground",
    backgroundToken: "--card",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "primary-foreground / primary",
    foregroundToken: "--primary-foreground",
    backgroundToken: "--primary",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "muted-foreground / background",
    foregroundToken: "--muted-foreground",
    backgroundToken: "--background",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "muted-foreground / card",
    foregroundToken: "--muted-foreground",
    backgroundToken: "--card",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "vote-up / card",
    foregroundToken: "--vote-up",
    backgroundToken: "--card",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
  {
    name: "vote-down / card",
    foregroundToken: "--vote-down",
    backgroundToken: "--card",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
  {
    name: "flair-human / card",
    foregroundToken: "--flair-human",
    backgroundToken: "--card",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
  {
    name: "flair-agent / card",
    foregroundToken: "--flair-agent",
    backgroundToken: "--card",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
  {
    name: "flair-bot / card",
    foregroundToken: "--flair-bot",
    backgroundToken: "--card",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
  {
    name: "flair-org / card",
    foregroundToken: "--flair-org",
    backgroundToken: "--card",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
];

/**
 * Converts a hex (#fff or #ffffff) or rgb(...) string to [r, g, b] numbers in 0-255 range.
 */
export function hexToRgb(color: string): [number, number, number] {
  const clean = color.trim().toLowerCase();

  // rgb(r, g, b)
  if (clean.startsWith("rgb")) {
    const parts = clean
      .replace(/[rgba()]/g, "")
      .split(",")
      .map((p) => Number.parseFloat(p.trim()));
    return [Math.round(parts[0] || 0), Math.round(parts[1] || 0), Math.round(parts[2] || 0)];
  }

  // hex
  let hex = clean.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = Number.parseInt(hex, 16);
  if (Number.isNaN(num)) {
    throw new Error(`Geçersiz renk kodu: ${color}`);
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Calculates relative luminance according to WCAG 2.1 specification:
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * where R, G, B are sRGB values transformed to linear channels.
 */
export function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const srgb = val / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes the contrast ratio between two colors using WCAG 2.1 formula:
 * (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter and L2 is the darker color.
 */
export function contrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(hexToRgb(color1));
  const l2 = relativeLuminance(hexToRgb(color2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Number.parseFloat(ratio.toFixed(2));
}

/**
 * Parses CSS variable tokens from CSS file text.
 */
export function parseThemeTokens(cssContent: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const lines = cssContent.split("\n");
  for (const line of lines) {
    const match = line.match(/^\s*(--[\w-]+):\s*([^;]+);/);
    if (match) {
      tokens[match[1]] = match[2].trim();
    }
  }
  return tokens;
}

export interface ContrastCheckResult {
  checkName: string;
  foregroundToken: string;
  backgroundToken: string;
  foregroundValue: string;
  backgroundValue: string;
  contrastRatio: number;
  minContrast: number;
  passed: boolean;
}

export interface ThemeContrastResult {
  themeId: string;
  fileName: string;
  passed: boolean;
  checks: ContrastCheckResult[];
  failures: ContrastCheckResult[];
}

export interface ThemeContrastReport {
  totalThemes: number;
  passedCount: number;
  failedCount: number;
  themes: ThemeContrastResult[];
}

/**
 * Audits a single theme's tokens against all defined WCAG AA contrast rules.
 */
export function auditThemeContrast(
  themeId: string,
  tokens: Record<string, string>,
  fileName = `${themeId}.css`,
): ThemeContrastResult {
  const checks: ContrastCheckResult[] = [];
  const failures: ContrastCheckResult[] = [];

  for (const def of CONTRAST_CHECKS) {
    const fgVal = tokens[def.foregroundToken];
    const bgVal = tokens[def.backgroundToken];

    if (!fgVal || !bgVal) {
      const missingResult: ContrastCheckResult = {
        checkName: def.name,
        foregroundToken: def.foregroundToken,
        backgroundToken: def.backgroundToken,
        foregroundValue: fgVal || "MISSING",
        backgroundValue: bgVal || "MISSING",
        contrastRatio: 0,
        minContrast: def.minContrast,
        passed: false,
      };
      checks.push(missingResult);
      failures.push(missingResult);
      continue;
    }

    try {
      const ratio = contrastRatio(fgVal, bgVal);
      const passed = ratio >= def.minContrast;
      const res: ContrastCheckResult = {
        checkName: def.name,
        foregroundToken: def.foregroundToken,
        backgroundToken: def.backgroundToken,
        foregroundValue: fgVal,
        backgroundValue: bgVal,
        contrastRatio: ratio,
        minContrast: def.minContrast,
        passed,
      };
      checks.push(res);
      if (!passed) {
        failures.push(res);
      }
    } catch {
      const errResult: ContrastCheckResult = {
        checkName: def.name,
        foregroundToken: def.foregroundToken,
        backgroundToken: def.backgroundToken,
        foregroundValue: fgVal,
        backgroundValue: bgVal,
        contrastRatio: 0,
        minContrast: def.minContrast,
        passed: false,
      };
      checks.push(errResult);
      failures.push(errResult);
    }
  }

  return {
    themeId,
    fileName,
    passed: failures.length === 0,
    checks,
    failures,
  };
}

/**
 * Audits all 22 CSS theme files in styles/themes.
 */
export function auditAllThemes(themesDir?: string): ThemeContrastReport {
  const targetDir = themesDir || path.resolve(process.cwd(), "styles/themes");
  const files = fs
    .readdirSync(targetDir)
    .filter((f) => f.endsWith(".css") && f !== "base.css" && f !== "index.css")
    .sort();

  const themeResults: ThemeContrastResult[] = [];

  for (const file of files) {
    const themeId = file.replace(/\.css$/, "");
    const content = fs.readFileSync(path.join(targetDir, file), "utf8");
    const tokens = parseThemeTokens(content);
    const result = auditThemeContrast(themeId, tokens, file);
    themeResults.push(result);
  }

  const passedCount = themeResults.filter((t) => t.passed).length;
  const failedCount = themeResults.filter((t) => !t.passed).length;

  return {
    totalThemes: themeResults.length,
    passedCount,
    failedCount,
    themes: themeResults,
  };
}

/**
 * CLI execution entrypoint
 */
export function runCli(): void {
  console.log("================================================================================");
  console.log("Actos Frontend — 22 Tema Otomatik WCAG 2.1 AA Kontrast Denetimi (Faz 17)");
  console.log("================================================================================");

  const report = auditAllThemes();

  for (const theme of report.themes) {
    const status = theme.passed ? "✔ PASS" : "✖ FAIL";
    console.log(`\n[${status}] Tema: ${theme.themeId} (${theme.fileName})`);

    for (const check of theme.checks) {
      const checkStatus = check.passed ? "  ✔" : "  ✖";
      console.log(
        `${checkStatus} ${check.checkName.padEnd(30)}: ${check.contrastRatio.toFixed(2)}:1 (Min: ${check.minContrast.toFixed(1)}:1) [${check.foregroundValue} on ${check.backgroundValue}]`,
      );
    }
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(
    `Sonuç: ${report.totalThemes} temanın ${report.passedCount} tanesi WCAG AA standartlarına uygun.`,
  );

  if (report.failedCount > 0) {
    console.error(`HATA: ${report.failedCount} tema kontrast eşiklerini geçemedi!`);
    process.exit(1);
  } else {
    console.log("BAŞARILI: 22 temanın tamamı WCAG 2.1 AA kontrast denetiminden geçti.");
    process.exit(0);
  }
}

// Check if running directly via CLI
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  runCli();
}
