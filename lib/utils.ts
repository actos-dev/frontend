import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generates an SEO and reader friendly URL slug from arbitrary text.
 * Correctly normalizes Turkish characters and strips non-alphanumeric punctuation.
 */
export function slugify(text?: string | null): string {
  if (!text) return "post";
  const trMap: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    I: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };

  const normalized = text
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (match) => trMap[match] || match)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "post";
}

/**
 * Formats a timestamp into human-readable relative time (Plan §4.1, §9).
 * E.g. "3sa önce" / "3h ago", "2dk önce" / "2m ago", "az önce" / "just now".
 */
export function formatRelativeTime(
  dateInput: Date | string | number,
  locale: string = "tr",
): string {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  const isTr = locale.toLowerCase().startsWith("tr");

  if (diffInSeconds < 60) {
    return isTr ? "az önce" : "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return isTr ? `${diffInMinutes}dk önce` : `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return isTr ? `${diffInHours}sa önce` : `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return isTr ? `${diffInDays}g önce` : `${diffInDays}d ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return isTr ? `${diffInMonths}ay önce` : `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return isTr ? `${diffInYears}yıl önce` : `${diffInYears}y ago`;
}

/**
 * Strips HTML tags and Markdown markers to extract a clean text preview for feed cards.
 */
export function extractExcerpt(content?: string | null, maxLength: number = 220): string {
  if (!content) return "";

  // Strip HTML tags
  let text = content.replace(/<[^>]+>/g, " ");

  // Unescape basic HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Clean Markdown links [text](url) -> text, bold **text** -> text, # headings, code backticks
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_~`#]/g, "");

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}…`;
}
