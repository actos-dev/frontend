import fs from "node:fs";
import path from "node:path";
import "server-only";
import type { Locale } from "@/lib/i18n";

/** The four published legal documents (ROADMAP.md D-07). */
export type LegalDocumentId = "terms" | "privacy" | "cookies" | "rules";

/**
 * The vendor text lives in `content/legal/<id>.<locale>.txt`. Those files are
 * the source of truth for the pages; the pages never reach outside the
 * repository for their content.
 */
const LEGAL_CONTENT_DIR = path.join(process.cwd(), "content", "legal");

const cache = new Map<string, string>();

/**
 * Reads one legal document for the active locale. Preformatted plain text,
 * returned verbatim: no markdown conversion, no truncation.
 */
export function getLegalDocument(documentId: LegalDocumentId, locale: Locale): string {
  const cacheKey = `${documentId}.${locale}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const text = fs.readFileSync(path.join(LEGAL_CONTENT_DIR, `${documentId}.${locale}.txt`), "utf8");
  cache.set(cacheKey, text);
  return text;
}
