import type { Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { rehypeExternalLinks } from "./rehype-external-links";
import { rehypeRestrictImages } from "./rehype-restrict-images";
import { rehypeTableWrap } from "./rehype-table-wrap";

/**
 * Markstone owns Markdown parsing, sanitization and Actos mention/tag
 * recognition. These transforms are deliberately presentation-only: they
 * operate on Markstone's already-safe HTML and add the affordances the web
 * product needs.
 */
export function createEnrichmentPipeline() {
  return unified()
    .use(rehypeSlug)
    .use(rehypeRestrictImages)
    .use(rehypeExternalLinks)
    .use(rehypeTableWrap)
    .use(rehypeStringify);
}

export function parseFragment(html: string): Root {
  return fromHtml(html, { fragment: true });
}

export function enrichPreviewHtml(html: string): string {
  const pipeline = createEnrichmentPipeline();
  const tree = pipeline.runSync(parseFragment(html)) as Root;
  return pipeline.stringify(tree);
}
