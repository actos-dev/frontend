export interface LegalDocumentPageProps {
  /** Localized document title rendered as the page heading. */
  title: string;
  /** Localized label for the revision line, e.g. "Last updated". */
  lastUpdatedLabel: string;
  /** Localized revision date, taken from the document metadata. */
  lastUpdated: string;
  /** Localized chrome note shown above the body. */
  note: string;
  /** The document body, rendered verbatim as preformatted text. */
  text: string;
}

/**
 * Shared shell for `/terms`, `/privacy`, `/cookies` and `/rules`
 * (ROADMAP.md D-07). The legal texts are preformatted (ASCII tables, `===`
 * rules), so the body is rendered inside a `whitespace-pre-wrap` block with
 * no markdown conversion and no truncation.
 */
export function LegalDocumentPage({
  title,
  lastUpdatedLabel,
  lastUpdated,
  note,
  text,
}: LegalDocumentPageProps) {
  return (
    <main className="reading-container px-4 py-10 sm:px-6 sm:py-14">
      <header className="border-b border-border pb-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-xs text-muted-foreground">
          {lastUpdatedLabel}: {lastUpdated}
        </p>
      </header>

      <p className="mt-4 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {note}
      </p>

      <article className="mt-6">
        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[0.8125rem] leading-6 text-foreground">
          {text}
        </pre>
      </article>
    </main>
  );
}
