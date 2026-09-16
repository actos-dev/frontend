/**
 * markstone swap note (ROADMAP F-02, B-11; markstone/PLAN.md §11):
 *
 * Once markstone publishes to npm, `renderContent` below is replaced by its
 * Node native path and `renderPreview` (lib/render/preview.ts) is replaced
 * by its WASM path. Both call the Actos family (the mention/tag-aware
 * build), not the generic one, so `lib/render/mentions-tags.ts` and this
 * file's sanitize/Shiki/link/table enrichment become markstone's job in one
 * module each. `excerpt` (lib/render/excerpt.ts) is untouched by the swap:
 * it works from the Markdown source, not from either rendered form.
 *
 * This is the only place that still knows the API used to return
 * `body_html`, and it doesn't — this pipeline renders straight from `body`.
 */
import "server-only";

import rehypeStringify from "rehype-stringify";
import { createBasePipeline } from "./pipeline";
import { rehypeHighlightCode } from "./shiki";
import { escapeHtml, stripInvisibleAndBidi } from "./text-sanitize";

export type RenderFormat = "markdown" | "plain";

export interface RenderContentOptions {
  /**
   * `"plain"` matches the API's `body_format`: the text is HTML-escaped and
   * wrapped in a single `<p>`, with no Markdown parsing at all — otherwise
   * a body someone wrote as plain text (say, literally `*star*`) would be
   * mistaken for Markdown and rendered in italics.
   */
  format?: RenderFormat;
}

function renderPlain(cleaned: string): string {
  const escaped = escapeHtml(cleaned).replace(/\r\n|\r|\n/g, "<br />");
  return `<p>${escaped}</p>`;
}

/**
 * Renders a post or comment body to sanitized HTML. Server only: this is
 * where Shiki runs, at render time, so no syntax highlighter ever ships to
 * the browser.
 */
export async function renderContent(
  markdown: string | null | undefined,
  options: RenderContentOptions = {},
): Promise<string> {
  const source = markdown ?? "";
  if (!source.trim()) return "";

  const cleaned = stripInvisibleAndBidi(source);

  if (options.format === "plain") {
    return renderPlain(cleaned);
  }

  const file = await createBasePipeline()
    .use(rehypeHighlightCode)
    .use(rehypeStringify)
    .process(cleaned);
  return String(file);
}
