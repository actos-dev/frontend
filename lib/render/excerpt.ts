import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { stripInvisibleAndBidi } from "./text-sanitize";

interface MinimalNode {
  type: string;
  value?: string;
  alt?: string | null;
  children?: MinimalNode[];
}

// Leaf block types: stringified as one unit each, then joined with spaces.
// Text is concatenated with no separators inside a block, so without this,
// adjacent paragraphs, list items and table cells would run together
// ("Hello world.Second para."). Stopping the recursion here, rather than at
// `list` or `table`, keeps each cell and item its own chunk.
const LEAF_BLOCKS = new Set(["paragraph", "heading", "listItem", "tableCell"]);

// Raw HTML never reaches the rendered body, because the pipeline drops it
// instead of escaping it, so it must not reach the excerpt either. Fenced
// code is skipped for a different reason: a description that opens with a
// dump of someone's SQL tells a reader nothing about the post.
const SKIPPED = new Set(["html", "code"]);

/**
 * Text of one leaf block, skipping raw HTML.
 *
 * `mdast-util-to-string` returns the `value` of any node that has one, which
 * includes inline `html` nodes, so it cannot be used directly here.
 */
function textOf(node: MinimalNode): string {
  if (SKIPPED.has(node.type)) return "";
  if (node.type === "image") {
    return typeof node.alt === "string" ? node.alt : "";
  }
  if (typeof node.value === "string") return node.value;
  if (Array.isArray(node.children)) return node.children.map(textOf).join("");
  return "";
}

function collect(node: MinimalNode, chunks: string[]): void {
  if (SKIPPED.has(node.type)) return;
  if (LEAF_BLOCKS.has(node.type)) {
    const text = textOf(node).trim();
    if (text) chunks.push(text);
    return;
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) collect(child, chunks);
  }
}

/**
 * Plain-text preview for feed cards, meta descriptions and OG images.
 *
 * Walks the *parsed* Markdown structure — not `body_html`, not a regex over
 * raw Markdown — so table pipes, `#` headings, fence markers and link URLs
 * never leak through. That leakage was the actual bug: the previous
 * `extractExcerpt` regex-stripped Markdown *syntax* but table delimiter
 * rows (`| --- |`) aren't syntax it recognized, so they showed up verbatim
 * in feed cards.
 */
export function excerpt(markdown: string | null | undefined, maxChars = 220): string {
  if (!markdown?.trim()) return "";

  const cleaned = stripInvisibleAndBidi(markdown);
  const tree = unified().use(remarkParse).use(remarkGfm).parse(cleaned);

  const chunks: string[] = [];
  collect(tree as unknown as MinimalNode, chunks);

  const text = chunks.join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;

  const sliced = text.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = (lastSpace > maxChars * 0.6 ? sliced.slice(0, lastSpace) : sliced).trimEnd();
  return `${cut}…`;
}
