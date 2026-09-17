import "server-only";

import type { Root } from "hast";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { parseFragment } from "./enrich-html";
import { rehypeExternalLinks } from "./rehype-external-links";
import { rehypeTableWrap } from "./rehype-table-wrap";
import { rehypeHighlightCode } from "./shiki";

export async function enrichServerHtml(html: string): Promise<string> {
  const pipeline = unified()
    .use(rehypeSlug)
    .use(rehypeExternalLinks)
    .use(rehypeTableWrap)
    .use(rehypeHighlightCode)
    .use(rehypeStringify);
  const tree = (await pipeline.run(parseFragment(html))) as Root;
  return pipeline.stringify(tree);
}
