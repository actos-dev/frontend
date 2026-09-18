import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { isAllowedImageSrc } from "../media";

/**
 * Disallow remote images in rendered bodies (ONEMLI.md, ROADMAP D-03b).
 *
 * An `<img>` whose `src` is not our media origin, a relative path, or an
 * inline `blob:`/`data:` URL is replaced by a plain link. The URL stays
 * reachable, but the reader's browser never auto-fetches it from a third
 * party, so a body cannot be used as a tracking pixel.
 *
 * Runs before `rehypeExternalLinks` so the replacement link picks up the
 * `target`/`rel` hardening from that pass.
 */
export function rehypeRestrictImages() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "img") return;

      const src = typeof node.properties.src === "string" ? node.properties.src : "";
      if (isAllowedImageSrc(src)) return;

      const alt = typeof node.properties.alt === "string" ? node.properties.alt.trim() : "";
      const link: Element = {
        type: "element",
        tagName: "a",
        properties: {
          href: src,
          target: "_blank",
          rel: ["noopener", "nofollow", "ugc"],
        },
        children: [{ type: "text", value: alt || src }],
      };

      if (parent && typeof index === "number") {
        parent.children[index] = link;
      }
    });
  };
}
