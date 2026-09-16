import type { Element, Parent, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Wraps every rendered `<table>` in a `.table-wrap` container so a wide
 * GFM table scrolls horizontally instead of breaking the ~68ch reading
 * measure or the page itself (ROADMAP F-02, prose CSS §6).
 */
export function rehypeTableWrap() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || !parent || index === undefined) return;

      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrap"] },
        children: [node],
      };
      (parent as Parent).children[index] = wrapper;
    });
  };
}
