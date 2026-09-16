/**
 * Deterministic avatar-initials tint (ROADMAP §1.2 Avatars, F-06).
 *
 * The fallback initials shown when an actor has no avatar image get a
 * background tint derived from their username: one of 8 muted hues, always
 * the same for the same username. The hue is combined with the theme's
 * `--tint-s` / `--tint-l` custom properties at render time, so the tint
 * stays legible (and correctly muted) across sepia, light and dark without
 * this module knowing anything about the active theme.
 */

const HUE_COUNT = 8;
const HUE_STEP = 360 / HUE_COUNT;

/** Hashes a username to one of 8 evenly-spaced hues (0, 45, 90, ...). */
export function hashUsernameToHue(username: string): number {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % HUE_COUNT;
  return index * HUE_STEP;
}

/**
 * CSS color value for an avatar's initials tint. Resolves `--tint-s` and
 * `--tint-l` at computed-value time, so it always matches the active theme.
 */
export function getAvatarTintColor(username: string): string {
  const hue = hashUsernameToHue(username);
  return `hsl(${hue} var(--tint-s) var(--tint-l))`;
}
