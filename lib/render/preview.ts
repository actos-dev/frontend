import rehypeStringify from "rehype-stringify";
import { createBasePipeline } from "./pipeline";
import { stripInvisibleAndBidi } from "./text-sanitize";

/**
 * The editor's live preview. Runs in the browser, so it shares every AST
 * rule with the server renderer (mentions/tags, sanitize, heading anchors,
 * external links, table wrapping) but never loads Shiki — no syntax
 * highlighter ships to the client (ROADMAP F-02, X-09).
 *
 * `markstone` swap note: once markstone publishes, this becomes a thin
 * wrapper around its WASM build instead (see `lib/render/index.ts`).
 */
export function renderPreview(markdown: string): string {
  if (!markdown?.trim()) return "";

  const cleaned = stripInvisibleAndBidi(markdown);
  const file = createBasePipeline().use(rehypeStringify).processSync(cleaned);
  return String(file);
}
