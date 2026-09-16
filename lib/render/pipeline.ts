import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { remarkMentionsAndTags } from "./mentions-tags";
import { rehypeExternalLinks } from "./rehype-external-links";
import { rehypeTableWrap } from "./rehype-table-wrap";
import { sanitizeSchema } from "./schema";

/**
 * The half of the pipeline shared by the server renderer (`index.ts`, which
 * adds Shiki on top) and the browser preview (`preview.ts`, which stops
 * here). Every step here is synchronous, so both callers can choose
 * `.process()` or `.processSync()` as needed.
 *
 * Order is the security contract:
 *
 * 1. `remark-parse` + `remark-gfm` — parse Markdown, including GFM tables,
 *    task lists and autolinks.
 * 2. `remarkMentionsAndTags` — the Actos extension, still on the mdast
 *    tree, before anything becomes HTML.
 * 3. `remark-rehype` with `allowDangerousHtml` left at its default
 *    (`false`) — raw HTML the document contains is dropped, not merely
 *    escaped, because we never call this with the flag that would let it
 *    survive.
 * 4. `rehype-sanitize` — runs immediately on the HTML that came out of the
 *    document and *before any enrichment step*. Everything after this
 *    point only adds fixed, trusted markup, so nothing after it needs to
 *    be re-sanitized.
 * 5. `rehype-slug`, `rehypeExternalLinks`, `rehypeTableWrap` (and, in
 *    `index.ts`, Shiki) — enrichment.
 */
export function createBasePipeline() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMentionsAndTags)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeSlug)
    .use(rehypeExternalLinks)
    .use(rehypeTableWrap);
}
