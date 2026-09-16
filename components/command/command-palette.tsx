"use client";

import type { Actor, Post } from "actos";
import { FileText, Hash, PenSquare, Search, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import { cn, slugify } from "@/lib/utils";

type ResultGroup = "actions" | "tags" | "actors" | "posts";

interface PaletteItem {
  id: string;
  group: ResultGroup;
  label: string;
  sublabel?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TagMatch {
  name: string;
}

const DEBOUNCE_MS = 250;

/**
 * ⌘K / Ctrl+K command palette (ROADMAP.md §1.4, S-04). Search posts as you
 * type, jump to `@user` or `#tag` by prefix, and always offer "New post".
 * Built entirely on the existing `Dialog` primitive — no new dependency.
 */
export function CommandPalette() {
  const { t } = useTranslation();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [tags, setTags] = React.useState<TagMatch[]>([]);
  const [actors, setActors] = React.useState<Actor[]>([]);
  const [posts, setPosts] = React.useState<Post[]>([]);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Global ⌘K / Ctrl+K toggle — independent of `lib/hooks/use-keyboard-shortcuts`,
  // which deliberately ignores every key chord held with Ctrl/Meta.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setTags([]);
      setActors([]);
      setPosts([]);
      setActiveIndex(0);
      setLoading(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (!trimmed) {
      setTags([]);
      setActors([]);
      setPosts([]);
      setLoading(false);
      setActiveIndex(0);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      const run = async () => {
        try {
          if (trimmed.startsWith("@")) {
            const q = trimmed.slice(1).trim();
            if (!q) {
              setActors([]);
              return;
            }
            const res = await fetch(`/api/search?type=actor&q=${encodeURIComponent(q)}&limit=6`, {
              signal: controller.signal,
            });
            const data = await res.json();
            if (!controller.signal.aborted) {
              setActors(data.items || []);
              setTags([]);
              setPosts([]);
              setActiveIndex(0);
            }
          } else if (trimmed.startsWith("#")) {
            const q = trimmed.slice(1).trim();
            if (!q) {
              setTags([]);
              return;
            }
            const res = await fetch(`/api/tags/search?q=${encodeURIComponent(q)}`, {
              signal: controller.signal,
            });
            const data = await res.json();
            if (!controller.signal.aborted) {
              setTags(((data.data as TagMatch[]) || []).slice(0, 6));
              setActors([]);
              setPosts([]);
              setActiveIndex(0);
            }
          } else {
            const res = await fetch(
              `/api/search?type=post&q=${encodeURIComponent(trimmed)}&limit=6`,
              {
                signal: controller.signal,
              },
            );
            const data = await res.json();
            if (!controller.signal.aborted) {
              setPosts(data.items || []);
              setTags([]);
              setActors([]);
              setActiveIndex(0);
            }
          }
        } catch (err) {
          // AbortError is expected churn from typing quickly; anything else
          // just leaves the palette showing whatever it already had rather
          // than taking the whole overlay down.
          if ((err as Error).name !== "AbortError") {
            setTags([]);
            setActors([]);
            setPosts([]);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      };

      run();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const items = React.useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      {
        id: "action-new-post",
        group: "actions",
        label: t("commandPalette.newPost"),
        href: "/new",
        icon: PenSquare,
      },
    ];

    for (const tag of tags) {
      list.push({
        id: `tag-${tag.name}`,
        group: "tags",
        label: `#${tag.name}`,
        href: `/t/${tag.name}`,
        icon: Hash,
      });
    }
    for (const actor of actors) {
      list.push({
        id: `actor-${actor.username}`,
        group: "actors",
        label: actor.displayName || actor.username,
        sublabel: `@${actor.username}`,
        href: `/u/${actor.username}`,
        icon: UserIcon,
      });
    }
    for (const post of posts) {
      list.push({
        id: `post-${post.id}`,
        group: "posts",
        label: post.title || t("commandPalette.untitledPost"),
        href: `/posts/${post.id}/${slugify(post.title || "post")}`,
        icon: FileText,
      });
    }

    return list;
  }, [tags, actors, posts, t]);

  const commit = React.useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) commit(item);
    }
  };

  const groupLabel = (group: ResultGroup): string => {
    switch (group) {
      case "tags":
        return t("commandPalette.groupTags");
      case "actors":
        return t("commandPalette.groupActors");
      case "posts":
        return t("commandPalette.groupPosts");
      default:
        return t("commandPalette.groupActions");
    }
  };

  let lastGroup: ResultGroup | null = null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-testid="command-palette"
        className="max-w-lg p-0 gap-0 overflow-hidden top-[18%] translate-y-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("commandPalette.title")}</DialogTitle>
          <DialogDescription>{t("commandPalette.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search className="w-4 h-4 text-fg-subtle shrink-0" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            data-testid="command-palette-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t("commandPalette.placeholder")}
            aria-label={t("commandPalette.placeholder")}
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="command-palette-list"
            aria-activedescendant={items[activeIndex]?.id}
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
          />
        </div>

        <div
          id="command-palette-list"
          role="listbox"
          className="max-h-80 overflow-y-auto py-1.5"
          aria-label={t("commandPalette.title")}
        >
          {items.length === 0 && !loading && (
            <p className="px-4 py-6 text-center text-sm text-fg-subtle">
              {t("commandPalette.noResults")}
            </p>
          )}

          {items.map((item, index) => {
            const Icon = item.icon;
            const showGroupLabel = item.group !== lastGroup;
            lastGroup = item.group;

            return (
              <React.Fragment key={item.id}>
                {showGroupLabel && (
                  <div className="px-4 pt-2.5 pb-1 text-[11px] font-mono uppercase tracking-wider text-fg-subtle">
                    {groupLabel(item.group)}
                  </div>
                )}
                <button
                  id={item.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  data-testid="command-palette-item"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(item)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-4 py-2 text-sm text-left cursor-pointer",
                    index === activeIndex
                      ? "bg-bg-subtle text-fg"
                      : "text-fg-muted hover:bg-bg-subtle",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                  {item.sublabel && (
                    <span className="font-mono text-xs text-fg-subtle truncate">
                      {item.sublabel}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
