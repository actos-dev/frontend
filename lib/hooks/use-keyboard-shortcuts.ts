"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onNavigate?: (href: string) => void;
  onSelectPost?: (index: number, element: HTMLElement | null) => void;
}

export interface UseKeyboardShortcutsResult {
  selectedIndex: number;
  shortcutsDialogOpen: boolean;
  setShortcutsDialogOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  clearSelection: () => void;
  selectNext: () => void;
  selectPrev: () => void;
}

/**
 * Plan §10.3 Kritik Kural:
 * Kullanıcı bir <input>, <textarea>, <select>, contenteditable veya form alanına
 * odaklanmışken klavye kısayolları KESİNLİKLE devre dışı olmalıdır!
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    return true;
  }

  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }

  return false;
}

const HIGHLIGHT_CLASSES = [
  "ring-2",
  "ring-primary",
  "ring-offset-2",
  "ring-offset-background",
  "rounded-xl",
  "transition-all",
];

export function highlightCard(cards: HTMLElement[], index: number): void {
  cards.forEach((card, idx) => {
    if (idx === index) {
      card.setAttribute("data-keyboard-selected", "true");
      card.classList.add(...HIGHLIGHT_CLASSES);
      if (typeof card.scrollIntoView === "function") {
        card.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    } else if (card.hasAttribute("data-keyboard-selected")) {
      card.removeAttribute("data-keyboard-selected");
      card.classList.remove(...HIGHLIGHT_CLASSES);
    }
  });
}

export function clearCardHighlights(): void {
  if (typeof document === "undefined") return;
  const cards = document.querySelectorAll<HTMLElement>(
    '[data-testid="post-card"][data-keyboard-selected="true"]',
  );
  cards.forEach((card) => {
    card.removeAttribute("data-keyboard-selected");
    card.classList.remove(...HIGHLIGHT_CLASSES);
  });
}

/**
 * useKeyboardShortcuts (Plan §10.3)
 *
 * Implements developer-first keyboard navigation:
 * - j / k: Select next / previous post
 * - o / Enter: Open selected post
 * - u: Upvote selected post
 * - s: Save / bookmark selected post
 * - /: Focus search input
 * - g h: Go to home / feed
 * - g s: Go to saved posts
 * - g n: Go to new post
 * - ?: Toggle shortcuts dialog
 * - Esc: Close dialog or deselect post
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {},
): UseKeyboardShortcutsResult {
  const { enabled = true, onNavigate, onSelectPost } = options;
  const router = useRouter();
  const pathname = usePathname();

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState<boolean>(false);

  const selectedIndexRef = useRef<number>(-1);
  const pendingChordRef = useRef<{ key: string; timer: NodeJS.Timeout } | null>(null);

  const navigate = useCallback(
    (href: string) => {
      if (onNavigate) {
        onNavigate(href);
      } else {
        router.push(href);
      }
    },
    [onNavigate, router],
  );

  const clearSelection = useCallback(() => {
    clearCardHighlights();
    setSelectedIndex(-1);
    selectedIndexRef.current = -1;
    onSelectPost?.(-1, null);
  }, [onSelectPost]);

  const selectNext = useCallback(() => {
    if (typeof document === "undefined") return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="post-card"]'));
    if (cards.length === 0) return;

    let nextIdx = selectedIndexRef.current + 1;
    if (selectedIndexRef.current < 0 || nextIdx >= cards.length) {
      nextIdx = selectedIndexRef.current < 0 ? 0 : cards.length - 1;
    }

    selectedIndexRef.current = nextIdx;
    setSelectedIndex(nextIdx);
    highlightCard(cards, nextIdx);
    onSelectPost?.(nextIdx, cards[nextIdx]);
  }, [onSelectPost]);

  const selectPrev = useCallback(() => {
    if (typeof document === "undefined") return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="post-card"]'));
    if (cards.length === 0) return;

    let prevIdx = selectedIndexRef.current - 1;
    if (selectedIndexRef.current < 0 || prevIdx < 0) {
      prevIdx = 0;
    }

    selectedIndexRef.current = prevIdx;
    setSelectedIndex(prevIdx);
    highlightCard(cards, prevIdx);
    onSelectPost?.(prevIdx, cards[prevIdx]);
  }, [onSelectPost]);

  // Route change clears post selection
  useEffect(() => {
    if (pathname) {
      clearSelection();
    }
  }, [pathname, clearSelection]);

  // Global keydown event listener
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Browser accelerator safety: Ctrl/Alt/Meta keys should NOT trigger single-key shortcuts
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // 2. CRITICAL RULE: If focus is inside an input/textarea/editable element, abort immediately!
      if (isEditableElement(event.target)) {
        return;
      }

      const key = event.key;

      // 3. Escape key handling: Close dialog or clear selection
      if (key === "Escape") {
        if (shortcutsDialogOpen) {
          event.preventDefault();
          setShortcutsDialogOpen(false);
          return;
        }
        if (selectedIndexRef.current !== -1) {
          event.preventDefault();
          clearSelection();
          return;
        }
        return;
      }

      // 4. '?' key: Toggle shortcuts dialog
      if (key === "?") {
        event.preventDefault();
        setShortcutsDialogOpen((prev) => !prev);
        return;
      }

      // If shortcuts dialog is open, do not handle navigation shortcuts behind it
      if (shortcutsDialogOpen) {
        return;
      }

      // 5. Chord sequences (e.g. 'g h', 'g s', 'g n')
      if (pendingChordRef.current?.key === "g") {
        clearTimeout(pendingChordRef.current.timer);
        pendingChordRef.current = null;

        const lowerKey = key.toLowerCase();
        if (lowerKey === "h") {
          event.preventDefault();
          navigate("/");
          return;
        }
        if (lowerKey === "s") {
          event.preventDefault();
          navigate("/saved");
          return;
        }
        if (lowerKey === "n") {
          event.preventDefault();
          navigate("/new");
          return;
        }
        // If not a chord extension, continue to check if this key itself is a shortcut
      } else if (key.toLowerCase() === "g") {
        event.preventDefault();
        if (pendingChordRef.current?.timer) {
          clearTimeout(pendingChordRef.current.timer);
        }
        const timer = setTimeout(() => {
          pendingChordRef.current = null;
        }, 1000);
        pendingChordRef.current = { key: "g", timer };
        return;
      }

      // 6. Search focus '/'
      if (key === "/") {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[aria-label="Arama kutusu"], input[name="q"], [data-testid="search-input"]',
        );
        if (searchInput) {
          searchInput.focus();
        } else {
          navigate("/search");
        }
        return;
      }

      // 7. Post navigation: 'j' (next) / 'k' (prev)
      if (key.toLowerCase() === "j") {
        event.preventDefault();
        selectNext();
        return;
      }

      if (key.toLowerCase() === "k") {
        event.preventDefault();
        selectPrev();
        return;
      }

      // 8. Post interactions on selected card: 'o', 'Enter', 'u', 's'
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="post-card"]'));
      const currentIdx = selectedIndexRef.current;

      if (currentIdx >= 0 && currentIdx < cards.length) {
        const card = cards[currentIdx];

        // Open post ('o' or 'Enter')
        if (key.toLowerCase() === "o" || key === "Enter") {
          event.preventDefault();
          const link =
            card.querySelector<HTMLAnchorElement>('[data-testid="post-title-link"]') ||
            card.querySelector<HTMLAnchorElement>('a[href^="/posts/"]') ||
            card.querySelector<HTMLAnchorElement>("h2 a");

          const targetHref = card.getAttribute("data-post-href") || link?.getAttribute("href");
          if (targetHref) {
            navigate(targetHref);
          } else if (link) {
            link.click();
          }
          return;
        }

        // Upvote ('u')
        if (key.toLowerCase() === "u") {
          event.preventDefault();
          const voteBtn = card.querySelector<HTMLButtonElement>(
            '[data-testid="post-vote-up"], button[aria-label="Yukarı oy ver"], button[aria-label="Oyu geri çek"]',
          );
          voteBtn?.click();
          return;
        }

        // Save / Bookmark ('s')
        if (key.toLowerCase() === "s") {
          event.preventDefault();
          const saveBtn = card.querySelector<HTMLButtonElement>(
            '[data-testid="post-save-btn"], button[aria-label="Kaydet"], button[aria-label="Kaydedilenlerden çıkar"]',
          );
          saveBtn?.click();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (pendingChordRef.current?.timer) {
        clearTimeout(pendingChordRef.current.timer);
      }
    };
  }, [enabled, shortcutsDialogOpen, navigate, selectNext, selectPrev, clearSelection]);

  return {
    selectedIndex,
    shortcutsDialogOpen,
    setShortcutsDialogOpen,
    clearSelection,
    selectNext,
    selectPrev,
  };
}
