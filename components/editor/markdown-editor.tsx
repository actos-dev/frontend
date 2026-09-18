"use client";

import { Bold, Code, Heading3, Italic, Link as LinkIcon, List, Loader2, Quote } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
  compact?: boolean;
  className?: string;
}

type PreviewRenderer = (markdown: string) => Promise<string>;

interface AutocompleteToken {
  trigger: "@" | "#";
  query: string;
  start: number;
  end: number;
}

interface AutocompleteSuggestion {
  value: string;
  label: string;
  detail?: string;
}

function tokenAtCursor(value: string, cursor: number): AutocompleteToken | null {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(?:^|\s)([@#])([a-zA-Z0-9_-]{1,32})$/);
  if (!match || (match[1] !== "@" && match[1] !== "#")) return null;
  const triggerOffset = match[0].lastIndexOf(match[1]);
  const start = (match.index ?? 0) + triggerOffset;
  return { trigger: match[1], query: match[2], start, end: cursor };
}

// Loaded once per page, on demand, and shared by every editor instance. The
// Markstone WASM renderer only reaches the browser when Preview is opened.
let previewRendererPromise: Promise<PreviewRenderer> | null = null;
function loadPreviewRenderer(): Promise<PreviewRenderer> {
  if (!previewRendererPromise) {
    previewRendererPromise = import("@/lib/render/preview").then((mod) => mod.renderPreview);
  }
  return previewRendererPromise;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  minRows = 12,
  compact = false,
  className,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const autocompleteId = React.useId();
  const [autocompleteToken, setAutocompleteToken] = React.useState<AutocompleteToken | null>(null);
  const [autocompleteItems, setAutocompleteItems] = React.useState<AutocompleteSuggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = React.useState(0);
  const [autocompleteLoading, setAutocompleteLoading] = React.useState(false);

  // The write path (textarea, onChange, drafts, submit) never touches any
  // of this — it only feeds `value` in as a plain string.
  const [previewHtml, setPreviewHtml] = React.useState("");
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState(false);
  const [previewAttempt, setPreviewAttempt] = React.useState(0);
  const renderRef = React.useRef<PreviewRenderer | null>(null);

  React.useEffect(() => {
    if (activeTab !== "preview") return;

    if (!value.trim()) {
      setPreviewHtml("");
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(false);
    if (previewAttempt > 0) setPreviewHtml("");
    const renderPromise = renderRef.current
      ? Promise.resolve(renderRef.current)
      : loadPreviewRenderer().then((render) => {
          renderRef.current = render;
          return render;
        });

    renderPromise
      .then((render) => render(value))
      .then((html) => {
        if (!cancelled) setPreviewHtml(html);
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewHtml("");
          setPreviewError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, value, previewAttempt]);

  React.useEffect(() => {
    if (!autocompleteToken) {
      setAutocompleteItems([]);
      setAutocompleteLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAutocompleteLoading(true);
      try {
        const url =
          autocompleteToken.trigger === "@"
            ? `/api/search?type=actor&limit=8&q=${encodeURIComponent(autocompleteToken.query)}`
            : `/api/tags/search?q=${encodeURIComponent(autocompleteToken.query)}`;
        const response = await fetch(url, { signal: controller.signal });
        const json = await response.json();
        if (!response.ok || controller.signal.aborted) return;

        const rawItems = autocompleteToken.trigger === "@" ? json.items : json.data;
        const nextItems: AutocompleteSuggestion[] = Array.isArray(rawItems)
          ? rawItems.slice(0, 8).flatMap((item: Record<string, unknown>) => {
              if (autocompleteToken.trigger === "@" && typeof item.username === "string") {
                return [
                  {
                    value: item.username,
                    label:
                      typeof item.displayName === "string" && item.displayName
                        ? item.displayName
                        : item.username,
                    detail: `@${item.username}`,
                  },
                ];
              }
              if (autocompleteToken.trigger === "#" && typeof item.name === "string") {
                return [{ value: item.name, label: `#${item.name}` }];
              }
              return [];
            })
          : [];
        setAutocompleteItems(nextItems);
        setActiveSuggestion(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setAutocompleteItems([]);
      } finally {
        if (!controller.signal.aborted) setAutocompleteLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [autocompleteToken]);

  const updateAutocompleteToken = (nextValue: string, cursor: number) => {
    setAutocompleteToken(tokenAtCursor(nextValue, cursor));
  };

  const selectSuggestion = (suggestion: AutocompleteSuggestion) => {
    if (!autocompleteToken) return;
    const insertion = `${autocompleteToken.trigger}${suggestion.value} `;
    const nextValue =
      value.slice(0, autocompleteToken.start) + insertion + value.slice(autocompleteToken.end);
    const nextCursor = autocompleteToken.start + insertion.length;
    onChange(nextValue);
    setAutocompleteToken(null);
    setAutocompleteItems([]);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const handleAutocompleteKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!autocompleteToken || autocompleteItems.length === 0) {
      if (event.key === "Escape") setAutocompleteToken(null);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveSuggestion(
        (current) => (current + direction + autocompleteItems.length) % autocompleteItems.length,
      );
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      selectSuggestion(autocompleteItems[activeSuggestion]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setAutocompleteToken(null);
    }
  };

  const applyFormatting = (
    formatType: "bold" | "italic" | "heading" | "link" | "code" | "quote" | "list",
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.slice(start, end);

    let replacement = "";
    let newStart = start;
    let newEnd = end;

    switch (formatType) {
      case "bold":
        replacement = selected ? `**${selected}**` : "**kalın metin**";
        newStart = start + 2;
        newEnd = selected ? end + 2 : start + 13;
        break;
      case "italic":
        replacement = selected ? `*${selected}*` : "*italik metin*";
        newStart = start + 1;
        newEnd = selected ? end + 1 : start + 13;
        break;
      case "heading":
        replacement = selected ? `\n### ${selected}` : "\n### Başlık";
        newStart = start + 5;
        newEnd = selected ? end + 5 : start + 11;
        break;
      case "link":
        replacement = selected ? `[${selected}](url)` : "[bağlantı metni](https://)";
        newStart = start + 1;
        newEnd = selected ? end + 1 : start + 14;
        break;
      case "code":
        replacement = selected ? `\n\`\`\`\n${selected}\n\`\`\`\n` : "\n```\n// kod buraya\n```\n";
        newStart = start + 5;
        newEnd = selected ? end + 5 : start + 18;
        break;
      case "quote":
        replacement = selected ? `\n> ${selected}` : "\n> alıntı metni";
        newStart = start + 3;
        newEnd = selected ? end + 3 : start + 15;
        break;
      case "list":
        replacement = selected ? `\n- ${selected}` : "\n- liste öğesi";
        newStart = start + 3;
        newEnd = selected ? end + 3 : start + 14;
        break;
    }

    const newText = text.slice(0, start) + replacement + text.slice(end);
    onChange(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newStart, newEnd);
      }
    }, 0);
  };

  return (
    <div
      data-testid="markdown-editor"
      className={cn("w-full border border-border rounded-lg bg-card overflow-hidden", className)}
    >
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "write" | "preview")}
        className="w-full"
      >
        {/* Editor Top Bar: Tabs + Toolbar */}
        <div className="flex items-center justify-between border-b border-border bg-surface-1 px-3 py-1.5 flex-wrap gap-2">
          <TabsList className="bg-surface-2 h-8 p-0.5">
            <TabsTrigger
              value="write"
              data-testid="tab-write"
              className="text-xs h-7 px-3 data-[state=active]:bg-card"
              onClick={() => setActiveTab("write")}
            >
              {t("editor.write_tab")}
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              data-testid="tab-preview"
              className="text-xs h-7 px-3 data-[state=active]:bg-card"
              onClick={() => setActiveTab("preview")}
            >
              {t("editor.preview_tab")}
            </TabsTrigger>
          </TabsList>

          {/* Formatting Toolbar (shown when write tab is active) */}
          {activeTab === "write" && (
            <div
              data-testid="editor-toolbar"
              className="flex items-center gap-1 text-muted-foreground"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyFormatting("bold")}
                disabled={disabled}
                title={t("editor.toolbar.bold")}
                data-testid="toolbar-bold"
              >
                <Bold className="w-3.5 h-3.5" />
                <span className="sr-only">{t("editor.toolbar.bold")}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyFormatting("italic")}
                disabled={disabled}
                title={t("editor.toolbar.italic")}
                data-testid="toolbar-italic"
              >
                <Italic className="w-3.5 h-3.5" />
                <span className="sr-only">{t("editor.toolbar.italic")}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyFormatting("heading")}
                disabled={disabled}
                title={t("editor.toolbar.heading")}
                data-testid="toolbar-heading"
              >
                <Heading3 className="w-3.5 h-3.5" />
                <span className="sr-only">{t("editor.toolbar.heading")}</span>
              </Button>

              <div className="w-[1px] h-4 bg-border mx-0.5" />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyFormatting("link")}
                disabled={disabled}
                title={t("editor.toolbar.link")}
                data-testid="toolbar-link"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="sr-only">{t("editor.toolbar.link")}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyFormatting("code")}
                disabled={disabled}
                title={t("editor.toolbar.code")}
                data-testid="toolbar-code"
              >
                <Code className="w-3.5 h-3.5" />
                <span className="sr-only">{t("editor.toolbar.code")}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyFormatting("quote")}
                disabled={disabled}
                title={t("editor.toolbar.quote")}
                data-testid="toolbar-quote"
              >
                <Quote className="w-3.5 h-3.5" />
                <span className="sr-only">{t("editor.toolbar.quote")}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyFormatting("list")}
                disabled={disabled}
                title={t("editor.toolbar.list")}
                data-testid="toolbar-list"
              >
                <List className="w-3.5 h-3.5" />
                <span className="sr-only">{t("editor.toolbar.list")}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Write Tab */}
        <TabsContent value="write" className="relative m-0 p-0 focus-visible:outline-hidden">
          <textarea
            ref={textareaRef}
            data-testid="markdown-textarea"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              updateAutocompleteToken(e.target.value, e.target.selectionStart);
            }}
            onClick={(e) =>
              updateAutocompleteToken(e.currentTarget.value, e.currentTarget.selectionStart)
            }
            onKeyDown={handleAutocompleteKeyDown}
            placeholder={placeholder || t("editor.body_placeholder")}
            disabled={disabled}
            rows={minRows}
            aria-autocomplete="list"
            aria-controls={autocompleteItems.length > 0 ? autocompleteId : undefined}
            aria-activedescendant={
              autocompleteItems.length > 0 ? `${autocompleteId}-${activeSuggestion}` : undefined
            }
            className={cn(
              "w-full resize-y font-mono text-sm leading-relaxed bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-hidden selection:bg-primary/20",
              compact ? "min-h-24 p-3" : "min-h-[300px] p-3.5",
            )}
          />
          {(autocompleteItems.length > 0 || autocompleteLoading) && autocompleteToken && (
            <div
              id={autocompleteId}
              role="listbox"
              aria-label={autocompleteToken.trigger === "@" ? "Kişi önerileri" : "Etiket önerileri"}
              className="absolute bottom-2 left-3 right-3 z-20 max-h-52 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
            >
              {autocompleteLoading && autocompleteItems.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("common.loading")}
                </div>
              ) : (
                autocompleteItems.map((item, index) => (
                  <button
                    key={`${autocompleteToken.trigger}${item.value}`}
                    id={`${autocompleteId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeSuggestion}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(item)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm",
                      index === activeSuggestion
                        ? "bg-surface-2 text-foreground"
                        : "text-foreground",
                    )}
                  >
                    <span className="truncate font-medium">{item.label}</span>
                    {item.detail && (
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {item.detail}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="m-0 p-0 focus-visible:outline-hidden">
          <div
            data-testid="markdown-preview"
            className={cn(compact ? "min-h-24 p-3" : "min-h-[300px] p-5", "overflow-y-auto")}
          >
            {previewLoading ? (
              <div
                data-testid="preview-loading"
                className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("editor.preview_loading") || "Loading preview…"}</span>
              </div>
            ) : previewError ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
                <p>{t("editor.preview_error")}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPreviewAttempt((attempt) => attempt + 1)}
                >
                  {t("common.retry")}
                </Button>
              </div>
            ) : previewHtml ? (
              <div
                data-testid="preview-reading-prose"
                className="prose selection:bg-primary/10"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by Markstone's browser WASM renderer
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-muted-foreground italic text-sm py-8 text-center">
                {t("editor.preview_empty")}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
