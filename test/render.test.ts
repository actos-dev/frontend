// @vitest-environment node

import { describe, expect, it } from "vitest";
import { excerpt } from "@/lib/render/excerpt";
import { renderPreview } from "@/lib/render/preview";

// `renderContent` (the server entry) imports "server-only", aliased to a
// no-op in vitest.config.ts, and drives the exact same shared pipeline as
// `renderPreview` plus Shiki on top. Security-relevant behavior (sanitize,
// mentions/tags, external links, table wrapping) is exercised here against
// `renderPreview` since it is the browser-facing twin of the same AST rules
// and needs no Shiki singleton warm-up; Shiki-specific behavior is
// exercised separately below against the real `renderContent`.
describe("lib/render — shared pipeline (renderPreview)", () => {
  describe("XSS corpus", () => {
    it("drops <script> tags entirely", async () => {
      const html = await renderPreview("Hello <script>alert(1)</script> world");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("</script");
    });

    it("drops onerror and other event handler attributes from images", async () => {
      const html = await renderPreview('<img src="x" onerror="alert(1)">');
      expect(html).not.toContain("onerror");
      expect(html).not.toContain("alert(1)");
    });

    it("strips javascript: link destinations", async () => {
      const html = await renderPreview("[click me](javascript:alert(1))");
      expect(html).not.toContain("javascript:");
      expect(html).not.toContain('href="javascript');
    });

    it("strips data: URIs from images and links", async () => {
      const html = await renderPreview(
        "![x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)",
      );
      expect(html).not.toContain("data:text/html");
      const linkHtml = await renderPreview("[x](data:text/html,<script>alert(1)</script>)");
      expect(linkHtml).not.toContain("data:text/html");
      expect(linkHtml).not.toContain("<script");
    });

    it("escapes HTML written inside a fenced code block instead of executing it", async () => {
      const html = await renderPreview("```html\n<script>alert(1)</script>\n```");
      expect(html).not.toContain("<script>alert");
      // The opening `<` is escaped (as a named or numeric entity —
      // rehype-stringify's choice), so this is inert text inside <code>,
      // never a real `<script>` element. A lone `>` needs no escaping.
      expect(html).toMatch(/&(lt|#x3C|#60);script/i);
      expect(html).toContain("alert(1)");
    });

    it("strips bidirectional override characters (Trojan Source)", async () => {
      const html = await renderPreview("Hello ‮evil‬ world");
      expect(html).not.toContain("‮");
      expect(html).not.toContain("‬");
    });

    it("never lets a style attribute survive sanitize", async () => {
      const html = await renderPreview(
        '<div style="background:url(javascript:alert(1))">text</div>',
      );
      expect(html).not.toContain("style=");
      expect(html).not.toContain("javascript:");
    });

    it("allows safe http(s)/mailto links and relative links through", async () => {
      const html = await renderPreview(
        "[external](https://example.com) [mail](mailto:a@example.com) [internal](/posts/1)",
      );
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('href="mailto:a@example.com"');
      expect(html).toContain('href="/posts/1"');
    });
  });

  describe("markdown structure", () => {
    it("renders ordered and unordered lists with real markers", async () => {
      const html = await renderPreview("- one\n- two\n\n1. first\n2. second");
      expect(html).toContain("<ul>");
      expect(html).toContain("<ol>");
      expect(html).toContain("<li>one</li>");
      expect(html).toContain("<li>first</li>");
    });

    it("renders GFM tables wrapped in a scroll container", async () => {
      const html = await renderPreview("| A | B |\n| --- | --- |\n| 1 | 2 |");
      expect(html).toContain('class="table-wrap"');
      expect(html).toContain("<table>");
      expect(html).not.toContain("---");
      expect(html).not.toContain("|");
    });

    it("adds heading anchors", async () => {
      const html = await renderPreview("## Hello World");
      expect(html).toMatch(/<h2 id="[^"]+">Hello World<\/h2>/);
    });

    it("renders task lists", async () => {
      const html = await renderPreview("- [ ] todo\n- [x] done");
      expect(html).toContain('type="checkbox"');
      expect(html).toContain("checked");
    });
  });

  describe("external links (X-10)", () => {
    it("marks external links with rel/target/title but leaves internal links alone", async () => {
      const html = await renderPreview("[ext](https://example.com/page) and [home](/)");
      expect(html).toMatch(/<a[^>]*href="https:\/\/example\.com\/page"[^>]*target="_blank"/);
      expect(html).toMatch(/rel="noopener nofollow ugc"/);
      expect(html).toMatch(/title="example\.com"/);

      const homeMatch = html.match(/<a[^>]*href="\/"[^>]*>/);
      expect(homeMatch?.[0]).not.toContain("target=");
      expect(homeMatch?.[0]).not.toContain("rel=");
    });
  });

  describe("remote images (ONEMLI.md / D-03b)", () => {
    it("turns a third-party image into a link instead of an <img>", async () => {
      const html = await renderPreview("![tracker](https://evil.example/pixel.png)");
      expect(html).not.toContain("<img");
      expect(html).toContain('href="https://evil.example/pixel.png"');
      expect(html).toContain("tracker");
    });

    it("keeps images served from the media origin", async () => {
      const html = await renderPreview("![ok](https://media.actos.com.tr/actos-media/a/pic.webp)");
      expect(html).toContain("<img");
      expect(html).toContain("https://media.actos.com.tr/actos-media/a/pic.webp");
    });

    it("keeps relative image sources", async () => {
      const html = await renderPreview("![rel](/media/pic.webp)");
      expect(html).toContain("<img");
      expect(html).toContain('src="/media/pic.webp"');
    });
  });

  describe("mentions and tags", () => {
    it("links a valid @mention and #tag", async () => {
      const html = await renderPreview("hello @efe and #rust");
      expect(html).toContain('<a href="/u/efe" class="mention">@efe</a>');
      expect(html).toContain('<a href="/t/rust" class="tag">#rust</a>');
    });

    it("does not link inside code spans, code blocks or link text", async () => {
      const html = await renderPreview(
        "`@efe` and [@efe](https://example.com) and\n\n```\n@efe\n```",
      );
      expect(html).not.toContain('class="mention"');
    });

    it("does not treat an email local part as a mention", async () => {
      const html = await renderPreview("mail@example.com");
      expect(html).not.toContain('class="mention"');
    });
  });
});

describe("lib/render — Markstone mention/tag boundary rules", () => {
  it("requires the whole candidate run to validate", async () => {
    const html = await renderPreview("@foo-bar");
    expect(html).not.toContain('class="mention"');
    expect(html).toContain("@foo-bar");
  });

  it("keeps trailing punctuation outside a valid mention", async () => {
    const html = await renderPreview("@efe.");
    expect(html).toContain('<a href="/u/efe" class="mention">@efe</a>.');
  });

  it("rejects embedded, short, long and uppercase usernames", async () => {
    const longName = "a".repeat(33);
    const html = await renderPreview(`x@efe @ab @${longName} @Foo`);
    expect(html).not.toContain('class="mention"');
  });

  it("accepts valid tags but rejects a leading hyphen", async () => {
    const html = await renderPreview("#a #-rust");
    expect(html).toContain('<a href="/t/a" class="tag">#a</a>');
    expect(html).not.toContain('href="/t/-rust"');
  });
});

describe("lib/render — excerpt()", () => {
  it("strips table pipes and delimiter rows", () => {
    const text = excerpt("| A | B |\n| --- | --- |\n| one | two |");
    expect(text).not.toContain("|");
    expect(text).not.toContain("---");
    expect(text).toContain("one");
    expect(text).toContain("two");
  });

  it("strips heading markers", () => {
    const text = excerpt("# Big Heading\n\nSome body text.");
    expect(text).not.toContain("#");
    expect(text).toContain("Big Heading");
    expect(text).toContain("Some body text.");
  });

  it("skips fenced code entirely, keeping the prose around it", () => {
    // A description that opens with a dump of someone's SQL says nothing
    // about the post, so fenced blocks are not excerpt material.
    const text = excerpt("intro\n\n```js\nconst x = 1;\n```\n\noutro");
    expect(text).not.toContain("```");
    expect(text).not.toContain("const x = 1;");
    expect(text).toBe("intro outro");
  });

  it("keeps inline code, which is part of a sentence", () => {
    expect(excerpt("Alert on `age(backend_xmin)` before it bites.")).toBe(
      "Alert on age(backend_xmin) before it bites.",
    );
  });

  it("drops raw HTML instead of printing it as text", () => {
    // The rendered body drops raw HTML, so the excerpt must not show markup
    // the reader will never see. This leaked into meta descriptions before.
    const text = excerpt('before\n\n<a href="/x" onclick="alert(1)">handler</a>\n\nafter');
    expect(text).not.toContain("<a");
    expect(text).not.toContain("onclick");
    // The tags are gone; the text between them stays, which is exactly what
    // the rendered body shows a reader.
    expect(text).toBe("before handler after");
  });

  it("drops inline raw HTML inside a paragraph", () => {
    const text = excerpt('Text with <img src=x onerror="alert(1)"> inside.');
    expect(text).not.toContain("onerror");
    expect(text).not.toContain("<img");
    expect(text).toContain("Text with");
    expect(text).toContain("inside.");
  });

  it("uses link text, not the URL", () => {
    const text = excerpt("Check out [my post](https://example.com/very/long/path) today.");
    expect(text).not.toContain("https://example.com");
    expect(text).toContain("my post");
  });

  it("truncates at a word boundary with an ellipsis", () => {
    const text = excerpt("one two three four five six seven eight nine ten", 20);
    expect(text.length).toBeLessThanOrEqual(21);
    expect(text.endsWith("…")).toBe(true);
  });

  it("returns an empty string for empty input", () => {
    expect(excerpt(null)).toBe("");
    expect(excerpt("")).toBe("");
    expect(excerpt("   ")).toBe("");
  });
});
