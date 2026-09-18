/**
 * The origin that serves user media (avatars, attachments).
 *
 * Public and build-time (`NEXT_PUBLIC_*`) because the rendered-markdown
 * policy below also runs in the browser preview. Defaults to the production
 * media host; the Docker build maps the server-side `ACTOS_MEDIA_URL` onto it.
 *
 * ## Remote images in bodies are disallowed (ONEMLI.md, D-03b)
 *
 * A post body may contain `![](https://third-party/x.png)`. Rendering that as
 * an `<img>` makes every reader's browser fetch it from the third party,
 * leaking their IP, user agent and timing (a tracking pixel). Until a proxy
 * exists, only our own media origin, relative URLs and `blob:`/`data:` may
 * render as images; everything else is turned into a plain link so the URL is
 * still reachable without leaking the reader.
 */
export const MEDIA_ORIGIN = (
  process.env.NEXT_PUBLIC_ACTOS_MEDIA_URL ?? "https://media.actos.com.tr"
).replace(/\/+$/, "");

/** Relative same-origin paths (`/media/...`), without the `//host` trap. */
function isRelative(src: string): boolean {
  return src.startsWith("/") && !src.startsWith("//");
}

/**
 * Whether an `<img src>` may be rendered as an image, or must become a link.
 *
 * Allowed: relative paths, `blob:` (local draft previews), `data:image/*`
 * (inline and self-contained), and absolute URLs on [`MEDIA_ORIGIN`].
 */
export function isAllowedImageSrc(src: string): boolean {
  if (!src) return false;
  if (isRelative(src) || src.startsWith("blob:") || src.startsWith("data:image/")) {
    return true;
  }
  try {
    return new URL(src).origin === MEDIA_ORIGIN;
  } catch {
    return false;
  }
}
