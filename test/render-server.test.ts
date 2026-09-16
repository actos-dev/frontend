// @vitest-environment node

import { describe, expect, it } from "vitest";
import { renderCommentTree } from "@/lib/render/comment-tree";
import { renderContent } from "@/lib/render/index";

// These exercise the server-only entry point directly (renderContent,
// renderCommentTree), which is only possible because vitest.config.ts
// aliases "server-only" to its own no-op export — the same thing a real
// "react-server" bundler condition would resolve to.
describe("lib/render/index — renderContent (server)", () => {
  it("renders an empty string for empty input", async () => {
    expect(await renderContent("")).toBe("");
    expect(await renderContent(null)).toBe("");
    expect(await renderContent(undefined)).toBe("");
  });

  it("format: plain escapes and wraps content in exactly one <p>, with no Markdown parsing", async () => {
    const html = await renderContent("Line one\n*not italic* & <b>not bold</b>", {
      format: "plain",
    });
    expect(html.match(/<p>/g)?.length).toBe(1);
    expect(html).not.toContain("<em>");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain("*not italic*");
    expect(html).toContain("<br />");
  });

  it("format: markdown runs the full pipeline (lists, mentions, sanitize)", async () => {
    const html = await renderContent("# Title\n\n- one\n- two\n\nHi @efe!", {
      format: "markdown",
    });
    expect(html).toContain("<h1");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain('class="mention"');
  });

  it("drops a <script> tag through the full server pipeline too", async () => {
    const html = await renderContent("<script>alert(1)</script>Hi", { format: "markdown" });
    expect(html).not.toContain("<script");
  });

  describe("Shiki syntax highlighting (X-09)", () => {
    it("highlights a registered language with dual-theme CSS variables", async () => {
      const html = await renderContent("```ts\nconst x: number = 1;\n```");
      expect(html).toContain('class="code-block"');
      expect(html).toContain('class="code-block-header"');
      expect(html).toContain('class="code-block-lang"');
      expect(html).toContain(">ts<");
      expect(html).toContain("data-copy-code");
      expect(html).toContain("shiki");
      expect(html).toContain("--shiki-light");
      expect(html).toContain("--shiki-dark");
    });

    it("falls back to plain text for an unregistered language instead of erroring", async () => {
      const html = await renderContent("```brainfuck\n+++.\n```");
      expect(html).toContain('class="code-block"');
      expect(html).toContain(">text<");
      expect(html).toContain("+++.");
    });

    it("gives one block a header, not a chip per line", async () => {
      const html = await renderContent("```sql\nSELECT 1;\nSELECT 2;\nSELECT 3;\n```");
      expect(html.match(/class="code-block-header"/g)?.length).toBe(1);
      expect(html.match(/<pre/g)?.length).toBe(1);
    });
  });
});

describe("lib/render/comment-tree — renderCommentTree", () => {
  it("fills in bodyHtml recursively from body, ignoring any stale bodyHtml", async () => {
    const tree = await renderCommentTree([
      {
        id: "c_1",
        body: "hello **world**",
        bodyFormat: "markdown",
        bodyHtml: "<p>stale</p>",
        replies: [
          {
            id: "c_2",
            body: "a reply",
            bodyFormat: "markdown",
            replies: [],
          } as never,
        ],
      } as never,
    ]);

    expect(tree[0].bodyHtml).toContain("<strong>world</strong>");
    expect(tree[0].bodyHtml).not.toContain("stale");
    expect(tree[0].replies?.[0]?.bodyHtml).toContain("a reply");
  });
});
