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
  className?: string;
}

type PreviewRenderer = (markdown: string) => string;

// Loaded once per page, on demand, and shared by every editor instance on
// it. The preview pipeline (lib/render/preview.ts — remark, rehype, the
// sanitize schema, the whole unified chain) is real weight, so someone who
// opens the composer to type never pays for it; it only reaches the
// browser the first time the Preview tab is actually activated.
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
  className,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // The write path (textarea, onChange, drafts, submit) never touches any
  // of this — it only feeds `value` in as a plain string.
  const [previewHtml, setPreviewHtml] = React.useState("");
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const renderRef = React.useRef<PreviewRenderer | null>(null);

  React.useEffect(() => {
    if (activeTab !== "preview") return;

    if (!value.trim()) {
      setPreviewHtml("");
      return;
    }

    if (renderRef.current) {
      setPreviewHtml(renderRef.current(value));
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    loadPreviewRenderer().then((render) => {
      if (cancelled) return;
      renderRef.current = render;
      setPreviewHtml(render(value));
      setPreviewLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab, value]);

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
        <TabsContent value="write" className="m-0 p-0 focus-visible:outline-hidden">
          <textarea
            ref={textareaRef}
            data-testid="markdown-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || t("editor.body_placeholder")}
            disabled={disabled}
            rows={minRows}
            className="w-full min-h-[300px] resize-y p-3.5 font-mono text-sm leading-relaxed bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-hidden selection:bg-primary/20"
          />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="m-0 p-0 focus-visible:outline-hidden">
          <div data-testid="markdown-preview" className="min-h-[300px] p-5 overflow-y-auto">
            {previewLoading ? (
              <div
                data-testid="preview-loading"
                className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("editor.preview_loading") || "Loading preview…"}</span>
              </div>
            ) : previewHtml ? (
              <div
                data-testid="preview-reading-prose"
                className="prose selection:bg-primary/10"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: safe escaped client markdown renderer
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
