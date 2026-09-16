"use client";

import type { ReactNode } from "react";

export interface CodeBlockEnhancerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Adds copy-to-clipboard behavior to the code blocks `lib/render` produces,
 * by delegating a single click listener over already-rendered (server) HTML
 * — it never re-renders or owns that markup. This is the only client-side
 * piece of a post or comment body (ROADMAP §1.5 X-09): the body itself
 * stays a Server Component, and Shiki never ships to the browser.
 */
export function CodeBlockEnhancer({ children, className }: CodeBlockEnhancerProps) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("[data-copy-code]");
    if (!button) return;

    const code = button.closest(".code-block")?.querySelector("pre")?.textContent ?? "";
    if (!code || !navigator.clipboard) return;

    navigator.clipboard
      .writeText(code)
      .then(() => {
        const original = button.textContent;
        button.textContent = "Copied";
        button.disabled = true;
        window.setTimeout(() => {
          button.textContent = original;
          button.disabled = false;
        }, 1500);
      })
      .catch(() => {
        // Clipboard permission denied or unavailable: no crash, no feedback.
      });
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pure event-delegation wrapper, not itself interactive
    // biome-ignore lint/a11y/useKeyWithClickEvents: the actual control is the delegated <button data-copy-code>, which already dispatches a native "click" on Enter/Space
    <div className={className} onClick={handleClick}>
      {children}
    </div>
  );
}
