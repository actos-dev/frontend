"use client";

import type { Tag } from "actos";
import { Hash, Loader2, Search, Tag as TagIcon, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

export interface TagsDirectoryProps {
  initialTags: Tag[];
}

export function TagsDirectory({ initialTags }: TagsDirectoryProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Tag[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search against /api/tags/search when typing
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      abortControllerRef.current?.abort();
      return;
    }

    // Cancel prior inflight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tags/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (res.ok && data.ok && Array.isArray(data.data)) {
          // Normalize tag matches
          const mapped: Tag[] = data.data.map((item: { name: string; postCount?: number }) => {
            const foundInInitial = initialTags.find(
              (t) => t.name.toLowerCase() === item.name.toLowerCase(),
            );
            return {
              name: item.name,
              postCount: item.postCount ?? foundInInitial?.postCount ?? 1,
              createdAt: foundInInitial?.createdAt || new Date().toISOString(),
            };
          });
          setSearchResults(mapped);
        }
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          // Fallback to client-side filtering if search fetch fails
          const matched = initialTags.filter((t) => t.name.toLowerCase().includes(trimmed));
          setSearchResults(matched);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, initialTags]);

  // Determine displayed tags: search results if active query, else initialTags
  const displayedTags = useMemo(() => {
    if (searchResults !== null) {
      return searchResults;
    }
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return initialTags;
    }
    return initialTags.filter((t) => t.name.toLowerCase().includes(trimmed));
  }, [searchResults, query, initialTags]);

  const handleClear = () => {
    setQuery("");
    setSearchResults(null);
    abortControllerRef.current?.abort();
  };

  return (
    <div className="space-y-6">
      {/* Arama & Filtreleme Kutusu */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Etiket ara veya filtrele..."
          className="pl-10 pr-10 h-10 rounded-xl bg-surface-2 border-border/70 focus-visible:ring-primary"
          aria-label="Etiket ara"
        />
        {isSearching && (
          <div className="absolute right-9 top-1/2 -translate-y-1/2 pointer-events-none">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Aramayı temizle"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Etiket Kartları Grid Düzeni */}
      {displayedTags.length > 0 ? (
        <div
          data-testid="tags-grid"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5"
        >
          {displayedTags.map((tag) => (
            <Link
              key={tag.name}
              href={`/t/${encodeURIComponent(tag.name)}`}
              data-testid={`tag-card-${tag.name}`}
              className="group flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-surface-2/40 transition-all shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-base font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  <span className="text-primary font-bold">#</span>
                  <span>{tag.name}</span>
                </span>
                <TagIcon className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary/70 transition-colors shrink-0 mt-0.5" />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">{tag.postCount ?? 0} gönderi</span>
                <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Göz at →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Boş durum (EmptyState) */
        <EmptyState
          icon={Hash}
          title="Eşleşen etiket bulunamadı."
          description="Aramanızla eşleşen etiket bulunamadı. Farklı bir terim deneyebilirsiniz."
          action={
            query
              ? {
                  label: "Aramayı Temizle",
                  onClick: handleClear,
                  variant: "outline",
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
