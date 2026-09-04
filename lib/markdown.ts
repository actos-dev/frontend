/**
 * Safe client-side Markdown to HTML renderer for post preview.
 * Strictly escapes raw HTML tags to prevent XSS attacks while
 * transforming Markdown syntax into clean HTML for reading-prose.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderMarkdown(markdown: string): string {
  if (!markdown?.trim()) {
    return "";
  }

  // 1. Extract fenced code blocks first to protect code content from other regexes
  const codeBlocks: string[] = [];
  let processed = markdown.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const index = codeBlocks.length;
    const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    codeBlocks.push(
      `<pre class="bg-surface-2 p-3.5 rounded-lg overflow-x-auto text-sm font-mono my-3 border border-border/70"><code${langClass}>${escapeHtml(
        code.replace(/\n$/, ""),
      )}</code></pre>`,
    );
    return `%%%CODE_BLOCK_${index}%%%`;
  });

  // 2. Escape raw HTML everywhere outside fenced code blocks
  processed = escapeHtml(processed);

  // 3. Restore blockquotes: lines starting with &gt;
  // Convert lines with &gt; to blockquotes
  const lines = processed.split("\n");
  const parsedLines: string[] = [];
  let inBlockquote = false;
  let quoteBuffer: string[] = [];

  let inList = false;
  let listBuffer: string[] = [];

  const flushQuote = () => {
    if (inBlockquote) {
      parsedLines.push(
        `<blockquote class="border-l-4 border-primary/50 pl-4 py-1 italic my-3 text-muted-foreground">${quoteBuffer.join(
          "<br />",
        )}</blockquote>`,
      );
      inBlockquote = false;
      quoteBuffer = [];
    }
  };

  const flushList = () => {
    if (inList) {
      parsedLines.push(
        `<ul class="list-disc list-inside space-y-1 my-3 text-foreground">${listBuffer.join(
          "",
        )}</ul>`,
      );
      inList = false;
      listBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Blockquote check
    if (trimmed.startsWith("&gt; ")) {
      flushList();
      inBlockquote = true;
      quoteBuffer.push(trimmed.slice(5));
      continue;
    }
    if (inBlockquote && trimmed.startsWith("&gt;")) {
      quoteBuffer.push(trimmed.slice(4));
      continue;
    }
    flushQuote();

    // List item check
    if (/^[-*]\s+/.test(trimmed)) {
      inList = true;
      const itemContent = trimmed.replace(/^[-*]\s+/, "");
      listBuffer.push(`<li>${itemContent}</li>`);
      continue;
    }
    flushList();

    // Headings
    if (trimmed.startsWith("### ")) {
      parsedLines.push(
        `<h3 class="text-xl font-semibold mt-4 mb-2 text-foreground font-serif">${trimmed.slice(
          4,
        )}</h3>`,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      parsedLines.push(
        `<h2 class="text-2xl font-bold mt-5 mb-2 text-foreground font-serif">${trimmed.slice(
          3,
        )}</h2>`,
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      parsedLines.push(
        `<h1 class="text-3xl font-extrabold mt-6 mb-3 text-foreground font-serif">${trimmed.slice(
          2,
        )}</h1>`,
      );
      continue;
    }

    parsedLines.push(line);
  }

  flushQuote();
  flushList();

  processed = parsedLines.join("\n");

  // 4. Inline elements: Bold, Italic, Code, Images, Links
  // Inline Code: `code`
  processed = processed.replace(
    /`([^`\n]+)`/g,
    `<code class="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-xs font-mono text-primary">$1</code>`,
  );

  // Images: ![alt](url)
  processed = processed.replace(
    /!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g,
    `<img src="$2" alt="$1" class="rounded-lg max-h-[500px] w-auto my-3 border border-border shadow-xs" />`,
  );

  // Links: [text](url)
  processed = processed.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|\/|#)[^\s)]+)\)/g,
    `<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">$1</a>`,
  );

  // Bold: **text** or __text__
  processed = processed.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  processed = processed.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  processed = processed.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  processed = processed.replace(/_([^_\n]+)_/g, "<em>$1</em>");

  // Paragraphs: Split on double newlines
  const paragraphs = processed.split(/\n{2,}/);
  const formattedParagraphs = paragraphs.map((p) => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    // If it's already a block element or code block placeholder, don't wrap in <p>
    if (
      trimmed.startsWith("<h1") ||
      trimmed.startsWith("<h2") ||
      trimmed.startsWith("<h3") ||
      trimmed.startsWith("<blockquote") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("%%%CODE_BLOCK_")
    ) {
      return trimmed;
    }
    // Convert single newlines inside paragraph to <br />
    const withBreaks = trimmed.replace(/\n/g, "<br />");
    return `<p class="leading-relaxed my-2 text-foreground">${withBreaks}</p>`;
  });

  let html = formattedParagraphs.filter(Boolean).join("\n");

  // 5. Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    html = html.replace(`%%%CODE_BLOCK_${i}%%%`, codeBlocks[i]);
  }

  return html;
}
