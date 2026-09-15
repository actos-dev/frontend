/**
 * Actos has exactly four theme choices (ROADMAP §1.2, K-06): "system"
 * follows the OS preference (resolved entirely in CSS, see
 * styles/tokens.css), and "sepia" / "light" / "dark" pin an explicit look.
 */
export type ThemeName = "system" | "sepia" | "light" | "dark";

export const DEFAULT_THEME: ThemeName = "system";

/** All theme choices, in the order the switcher displays them. */
export const THEME_NAMES: readonly ThemeName[] = ["system", "sepia", "light", "dark"];

/** Theme names that map to an explicit `data-theme` attribute value. */
export const EXPLICIT_THEME_NAMES: readonly Exclude<ThemeName, "system">[] = [
  "sepia",
  "light",
  "dark",
];

export function isValidTheme(value: string): value is ThemeName {
  return (THEME_NAMES as readonly string[]).includes(value);
}

/**
 * The `data-theme` attribute value to render for a given theme.
 * "system" renders `undefined` (React then omits the attribute entirely),
 * so styles/tokens.css resolves the look via `prefers-color-scheme`.
 */
export function themeAttribute(theme: ThemeName): Exclude<ThemeName, "system"> | undefined {
  return theme === "system" ? undefined : theme;
}
