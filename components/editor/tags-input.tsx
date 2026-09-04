"use client";

import { Hash, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface TagSuggestion {
  name: string;
  postCount?: number;
}

export interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Sanitizes a tag string:
 * - Trims leading # and whitespace
 * - Converts to lowercase
 * - Strips any non-alphanumeric, non-hyphen, non-underscore characters
 * - Truncates to max 32 characters
 */
export function sanitizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}

export function TagsInput({
  value = [],
  onChange,
  maxTags = 5,
  disabled = false,
  className,
}: TagsInputProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<TagSuggestion[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [_isLoading, setIsLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isAtLimit = value.length >= maxTags;

  const addTag = (rawTag: string) => {
    if (disabled || isAtLimit) return;
    const clean = sanitizeTag(rawTag);
    if (!clean) return;

    if (!value.includes(clean)) {
      onChange([...value, clean]);
    }
    setInputValue("");
    setSuggestions([]);
    setIsDropdownOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    if (disabled) return;
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Autocomplete debounced fetch
  React.useEffect(() => {
    const cleanQuery = sanitizeTag(inputValue);
    if (!cleanQuery || cleanQuery.length < 1) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/tags/search?q=${encodeURIComponent(cleanQuery)}`);
        if (res.ok) {
          const json = await res.json();
          const items: TagSuggestion[] = json.data || json.tags || [];
          // Filter out tags that are already selected
          const unselected = items.filter((s) => !value.includes(s.name));
          setSuggestions(unselected);
          setIsDropdownOpen(unselected.length > 0);
        }
      } catch (err) {
        console.warn("Tags autocomplete search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputValue, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      e.preventDefault();
      removeTag(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="tags-input-container"
      className={cn("relative w-full space-y-1.5", className)}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-[42px] px-3 py-1.5 rounded-lg border border-border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all",
          disabled && "opacity-60 cursor-not-allowed bg-muted/20",
        )}
      >
        {/* Selected Tag Badges */}
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            data-testid={`tag-badge-${tag}`}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-surface-2 border border-border hover:bg-surface-3 transition-colors"
          >
            <Hash className="w-3 h-3 text-muted-foreground" />
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                data-testid={`remove-tag-${tag}`}
                aria-label={`Remove tag ${tag}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="ml-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted p-0.5 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}

        {/* Input Field */}
        {!isAtLimit && (
          <input
            ref={inputRef}
            data-testid="tags-input-field"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setIsDropdownOpen(true);
            }}
            placeholder={value.length === 0 ? t("editor.tags_placeholder") : ""}
            disabled={disabled}
            maxLength={32}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden py-1"
          />
        )}
      </div>

      {/* Limit Warning */}
      {isAtLimit && (
        <p data-testid="tags-limit-warning" className="text-[11px] text-muted-foreground">
          {t("editor.max_tags_warning")}
        </p>
      )}

      {/* Autocomplete Dropdown */}
      {isDropdownOpen && suggestions.length > 0 && !isAtLimit && (
        <div
          data-testid="tags-autocomplete-dropdown"
          className="absolute z-50 left-0 top-full mt-1 w-full max-w-sm rounded-lg border border-border bg-popover shadow-md overflow-hidden animate-in fade-in-50 zoom-in-95"
        >
          <div className="py-1 max-h-48 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.name}
                type="button"
                data-testid={`tag-suggestion-${item.name}`}
                onClick={() => addTag(item.name)}
                className="w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-surface-2 transition-colors cursor-pointer text-popover-foreground"
              >
                <span className="font-mono text-xs flex items-center gap-1">
                  <span className="text-muted-foreground">#</span>
                  <span className="font-medium text-foreground">{item.name}</span>
                </span>
                {typeof item.postCount === "number" && (
                  <span className="text-[11px] text-muted-foreground">{item.postCount} post</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
