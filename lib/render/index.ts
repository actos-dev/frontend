import "server-only";

import { actos } from "markstone";
import { enrichServerHtml } from "./enrich-html-server";
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
 * Renders a post or comment body to sanitized HTML. Markstone's native Node
 * path owns Markdown parsing, sanitization and Actos extensions; the web
 * layer then adds headings, external-link policy, table overflow and Shiki.
 * Server only, so no syntax highlighter reaches the browser bundle.
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

  return enrichServerHtml(actos.toHtml(cleaned));
}
