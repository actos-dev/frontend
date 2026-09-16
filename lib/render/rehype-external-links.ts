import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

const ABSOLUTE_HTTP = /^https?:\/\//i;

/**
 * ROADMAP §1.5 X-10: external links in a rendered body open in a new tab,
 * never pass link-ranking weight or a referrer, and show the destination
 * domain on hover. Relative links (including the `mention`/`tag` links
 * `remarkMentionsAndTags` produces) are left exactly as rendered.
 *
 * Runs after `rehype-sanitize`: it only adds fixed, trusted attributes, so
 * it never needs to be sanitized itself.
 */
export function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;

      const href = typeof node.properties.href === "string" ? node.properties.href : "";
      if (!ABSOLUTE_HTTP.test(href)) return;

      node.properties.target = "_blank";
      node.properties.rel = ["noopener", "nofollow", "ugc"];

      try {
        node.properties.title = new URL(href).hostname;
      } catch {
        // Not a URL the platform can parse: still opens in a new tab (the
        // scheme check above already guaranteed that), just no hover hint.
      }
    });
  };
}
