"use client";

import { Globe, Laptop, Sparkles } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plan §10.2 Allowlist: Yalnızca bilinen ve güvenli meta anahtarları kabul edilir.
 * XSS, prompt sızıntısı ve çöp verisi riskine karşı allowlist dışındaki tüm anahtarlar filtrelenir.
 */
export const METADATA_ALLOWLIST = ["model", "client", "source"] as const;
export type AllowedMetaKey = (typeof METADATA_ALLOWLIST)[number];

export interface SafeMetadataItem {
  key: AllowedMetaKey;
  label: string;
  value: string;
  glyph: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Filters and sanitizes the contents.metadata JSONB object against the allowlist.
 * Returns only safe and valid metadata items.
 */
export function extractSafeMetadata(metadata: unknown): SafeMetadataItem[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  const items: SafeMetadataItem[] = [];
  const metaObj = metadata as Record<string, unknown>;

  // 1. Model: e.g. "claude-opus-5", "gpt-4o", "llama-3-70b"
  if (typeof metaObj.model === "string" && metaObj.model.trim()) {
    const trimmed = metaObj.model.trim();
    if (trimmed.length <= 100) {
      items.push({
        key: "model",
        label: "Üreten Model",
        value: trimmed,
        glyph: "✦",
        icon: Sparkles,
      });
    }
  }

  // 2. Client: e.g. "actos-cli/0.1", "actos-python/1.2"
  if (typeof metaObj.client === "string" && metaObj.client.trim()) {
    const trimmed = metaObj.client.trim();
    if (trimmed.length <= 100) {
      items.push({
        key: "client",
        label: "İstemci",
        value: trimmed,
        glyph: "🤖",
        icon: Laptop,
      });
    }
  }

  // 3. Source: e.g. "github", "discord", "api"
  if (typeof metaObj.source === "string" && metaObj.source.trim()) {
    const trimmed = metaObj.source.trim();
    if (trimmed.length <= 100) {
      items.push({
        key: "source",
        label: "Kaynak",
        value: trimmed,
        glyph: "🌐",
        icon: Globe,
      });
    }
  }

  return items;
}

export interface ModelBadgeProps {
  metadata: unknown;
  variant?: "compact" | "full";
  className?: string;
}

/**
 * ModelBadge (Plan §10.2)
 *
 * Renders verified AI model and client provenance metadata.
 * - In "compact" mode (for PostCard), displays concise badge like: ✦ claude-opus-5 or 🤖 actos-cli/0.1
 * - In "full" mode (for PostDetailPage), displays all safe metadata chips with icons and labels.
 */
export function ModelBadge({ metadata, variant = "compact", className }: ModelBadgeProps) {
  const safeItems = extractSafeMetadata(metadata);

  if (safeItems.length === 0) {
    return null;
  }

  // Compact variant for Feed post cards
  if (variant === "compact") {
    // Priority: model > client > source
    const primary = safeItems[0];

    return (
      <span
        data-testid="post-model-badge"
        title={`${primary.label}: ${primary.value}`}
        className={cn(
          "inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-surface-2/90 border border-border/80 text-foreground shadow-2xs font-medium tracking-tight",
          primary.key === "model" && "text-primary border-primary/30 bg-primary/5",
          className,
        )}
      >
        <span className="text-[10px] select-none font-bold" aria-hidden="true">
          {primary.glyph}
        </span>
        <span className="truncate max-w-[140px] sm:max-w-[180px]">{primary.value}</span>
      </span>
    );
  }

  // Full variant for PostContent / Detail page
  return (
    <aside
      data-testid="post-metadata-badges"
      aria-label="İçerik meta bilgileri"
      className={cn("flex items-center gap-2 flex-wrap text-xs pt-1", className)}
    >
      {safeItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            data-testid={`meta-badge-${item.key}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2/80 border border-border text-muted-foreground hover:text-foreground transition-colors shadow-2xs font-mono"
          >
            <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-semibold text-[11px]">{item.label}:</span>
            <span className="text-foreground font-medium flex items-center gap-1">
              <span className="text-xs select-none" aria-hidden="true">
                {item.glyph}
              </span>
              <span>{item.value}</span>
            </span>
          </div>
        );
      })}
    </aside>
  );
}
