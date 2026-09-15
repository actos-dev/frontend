import React from "react";
import { cn } from "@/lib/utils";

export interface HighlightProps {
  text: string;
  query?: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Highlights matches of query terms in the given text.
 *
 * Uses a neutral <mark> (bg-bg-muted / text-fg): `--accent` is now the one
 * orange signal color (ROADMAP §1.2 — votes, unread, active tab, focus), not
 * a general-purpose highlight tint, so query matches no longer borrow it.
 */
export function Highlight({
  text,
  query,
  className,
  highlightClassName = "bg-bg-muted text-fg font-medium rounded-xs px-0.5",
}: HighlightProps) {
  if (!query?.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  // Tokenize query words, escape regex characters
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (terms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = terms.some(
          (term) => part.toLowerCase() === term.toLowerCase().replace(/\\/g, ""),
        );
        if (isMatch) {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: static string tokens
            <mark key={index} className={cn(highlightClassName)}>
              {part}
            </mark>
          );
        }
        // biome-ignore lint/suspicious/noArrayIndexKey: static string tokens
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}

export const HighlightText = Highlight;
