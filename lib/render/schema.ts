import type { Options as Schema } from "rehype-sanitize";
import { defaultSchema } from "rehype-sanitize";

/**
 * The sanitize schema this pipeline runs against, extending
 * `hast-util-sanitize`'s GitHub-flavored default:
 *
 * - `href`/`src` protocols are narrowed to `http`, `https` and `mailto` —
 *   matching markstone's `validate_url` exactly (`javascript:`, `data:` and
 *   friends never survive; relative URLs are untouched by a protocol list
 *   at all, on both sides).
 * - `<a>` may additionally carry the `mention`/`tag` class names that
 *   `remarkMentionsAndTags` adds — and nothing else. Every other class name
 *   this pipeline's own enrichment steps add (Shiki, the code block header,
 *   the table-scroll wrapper, heading anchors) is introduced *after*
 *   sanitize runs, so it never needs a schema entry here.
 *
 * This must run before any enrichment step: sanitize only has to reason
 * about markup that came out of the document itself.
 */

const SAFE_PROTOCOLS = ["http", "https", "mailto"];

const baseAnchorAttributes = (defaultSchema.attributes?.a ?? []).filter(
  (entry) => !(Array.isArray(entry) && entry[0] === "className"),
);

export const sanitizeSchema: Schema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    href: SAFE_PROTOCOLS,
    src: SAFE_PROTOCOLS,
  },
  attributes: {
    ...defaultSchema.attributes,
    a: [...baseAnchorAttributes, ["className", "data-footnote-backref", "mention", "tag"]],
  },
};
