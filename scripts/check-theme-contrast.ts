import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * WCAG 2.1 AA Contrast Thresholds
 */
export const WCAG_NORMAL_TEXT_THRESHOLD = 4.5;
export const WCAG_LARGE_TEXT_OR_UI_THRESHOLD = 3.0;

/** The three themes this app ships (ROADMAP §1.2, K-06). "system" resolves to sepia or dark and needs no separate check. */
export const THEME_IDS = ["sepia", "light", "dark"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export interface ContrastCheckDefinition {
  name: string;
  foregroundToken: string;
  backgroundToken: string;
  minContrast: number;
  category: "normal-text" | "ui-component";
}

/**
 * ROADMAP F-05 §6 pairs:
 *   --fg, --fg-muted, --accent-text, --danger, --success, --warning: >= 4.5:1
 *     on both --bg and --bg-subtle
 *   --fg-subtle and --accent: >= 3:1 on both --bg and --bg-subtle, because
 *     vote arrows and timestamps sit on hovered rows as often as on the page
 *   --bg on --fg (the ink button's text): >= 4.5:1
 */
export const CONTRAST_CHECKS: ContrastCheckDefinition[] = [
  {
    name: "fg / bg",
    foregroundToken: "--fg",
    backgroundToken: "--bg",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "fg / bg-subtle",
    foregroundToken: "--fg",
    backgroundToken: "--bg-subtle",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "fg-muted / bg",
    foregroundToken: "--fg-muted",
    backgroundToken: "--bg",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "fg-muted / bg-subtle",
    foregroundToken: "--fg-muted",
    backgroundToken: "--bg-subtle",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "accent-text / bg",
    foregroundToken: "--accent-text",
    backgroundToken: "--bg",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "accent-text / bg-subtle",
    foregroundToken: "--accent-text",
    backgroundToken: "--bg-subtle",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "danger / bg",
    foregroundToken: "--danger",
    backgroundToken: "--bg",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "danger / bg-subtle",
    foregroundToken: "--danger",
    backgroundToken: "--bg-subtle",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "success / bg",
    foregroundToken: "--success",
    backgroundToken: "--bg",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "success / bg-subtle",
    foregroundToken: "--success",
    backgroundToken: "--bg-subtle",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "warning / bg",
    foregroundToken: "--warning",
    backgroundToken: "--bg",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "warning / bg-subtle",
    foregroundToken: "--warning",
    backgroundToken: "--bg-subtle",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
  },
  {
    name: "fg-subtle / bg",
    foregroundToken: "--fg-subtle",
    backgroundToken: "--bg",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
  {
    name: "fg-subtle / bg-subtle",
    foregroundToken: "--fg-subtle",
    backgroundToken: "--bg-subtle",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
  {
    name: "accent / bg",
    foregroundToken: "--accent",
    backgroundToken: "--bg",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
  {
    name: "accent / bg-subtle",
    foregroundToken: "--accent",
    backgroundToken: "--bg-subtle",
    minContrast: WCAG_LARGE_TEXT_OR_UI_THRESHOLD,
    category: "ui-component",
  },
  {
    name: "bg / fg (button text)",
    foregroundToken: "--bg",
    backgroundToken: "--fg",
    minContrast: WCAG_NORMAL_TEXT_THRESHOLD,
    category: "normal-text",
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
    throw new Error(`Invalid color value: ${color}`);
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
 * Extracts the `:root` (default / sepia), `:root[data-theme="..."]` and the
 * `prefers-color-scheme: dark` blocks from styles/tokens.css and returns the
 * token map for each of the three themes.
 */
export function parseTokenThemes(cssContent: string): Record<ThemeId, Record<string, string>> {
  const declRegex = /(--[\w-]+):\s*([^;]+);/g;

  function parseBlock(block: string): Record<string, string> {
    const tokens: Record<string, string> = {};
    for (const match of block.matchAll(declRegex)) {
      tokens[match[1]] = match[2].trim();
    }
    return tokens;
  }

  /** Extracts the body of the first `{...}` block that follows `selector`, respecting brace nesting. */
  function extractBlock(selector: string): string {
    const startIdx = cssContent.indexOf(selector);
    if (startIdx === -1) {
      throw new Error(`Selector not found in styles/tokens.css: ${selector}`);
    }
    const braceStart = cssContent.indexOf("{", startIdx);
    let depth = 0;
    let i = braceStart;
    for (; i < cssContent.length; i++) {
      if (cssContent[i] === "{") depth++;
      if (cssContent[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    return cssContent.slice(braceStart + 1, i);
  }

  return {
    sepia: parseBlock(extractBlock('[data-theme="sepia"]')),
    light: parseBlock(extractBlock('[data-theme="light"]')),
    dark: parseBlock(extractBlock('[data-theme="dark"]')),
  };
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
    passed: failures.length === 0,
    checks,
    failures,
  };
}

/**
 * Audits sepia, light and dark from styles/tokens.css against every WCAG AA contrast rule.
 */
export function auditAllThemes(tokensCssPath?: string): ThemeContrastReport {
  const targetPath = tokensCssPath || path.resolve(process.cwd(), "styles/tokens.css");
  const content = fs.readFileSync(targetPath, "utf8");
  const themeTokens = parseTokenThemes(content);

  const themeResults: ThemeContrastResult[] = THEME_IDS.map((themeId) =>
    auditThemeContrast(themeId, themeTokens[themeId]),
  );

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
  console.log("Actos Frontend — WCAG 2.1 AA contrast audit (sepia, light, dark)");
  console.log("================================================================================");

  const report = auditAllThemes();

  for (const theme of report.themes) {
    const status = theme.passed ? "✔ PASS" : "✖ FAIL";
    console.log(`\n[${status}] Theme: ${theme.themeId}`);

    for (const check of theme.checks) {
      const checkStatus = check.passed ? "  ✔" : "  ✖";
      console.log(
        `${checkStatus} ${check.checkName.padEnd(24)}: ${check.contrastRatio.toFixed(2)}:1 (min ${check.minContrast.toFixed(1)}:1) [${check.foregroundValue} on ${check.backgroundValue}]`,
      );
    }
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`Result: ${report.passedCount} / ${report.totalThemes} themes pass WCAG AA.`);

  if (report.failedCount > 0) {
    console.error(`FAILED: ${report.failedCount} theme(s) did not clear the contrast thresholds.`);
    process.exit(1);
  } else {
    console.log("PASSED: all themes clear WCAG 2.1 AA contrast.");
    process.exit(0);
  }
}

// Check if running directly via CLI
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  runCli();
}
