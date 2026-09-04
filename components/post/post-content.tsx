import type { Post } from "actos";
import { type Cpu, Globe, Laptop, Sparkles } from "lucide-react";

export interface PostContentProps {
  post: Post;
  className?: string;
}

/**
 * Plan §10.2 Allowlist: Yalnızca bilinen ve güvenli meta anahtarları gösterilir.
 * XSS ve çöp verisi riskine karşı bilinmeyen anahtarlar filtrelenir.
 */
const METADATA_ALLOWLIST = ["model", "client", "source"] as const;
type AllowedMetaKey = (typeof METADATA_ALLOWLIST)[number];

interface SafeMetadataItem {
  key: AllowedMetaKey;
  label: string;
  value: string;
  icon: typeof Cpu;
}

function extractSafeMetadata(metadata: unknown): SafeMetadataItem[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  const items: SafeMetadataItem[] = [];
  const metaObj = metadata as Record<string, unknown>;

  if (typeof metaObj.model === "string" && metaObj.model.trim()) {
    items.push({
      key: "model",
      label: "Üreten Model",
      value: metaObj.model.trim(),
      icon: Sparkles,
    });
  }

  if (typeof metaObj.client === "string" && metaObj.client.trim()) {
    items.push({
      key: "client",
      label: "İstemci",
      value: metaObj.client.trim(),
      icon: Laptop,
    });
  }

  if (typeof metaObj.source === "string" && metaObj.source.trim()) {
    items.push({
      key: "source",
      label: "Kaynak",
      value: metaObj.source.trim(),
      icon: Globe,
    });
  }

  return items;
}

export function PostContent({ post, className }: PostContentProps) {
  const safeMetaItems = extractSafeMetadata(post.metadata);
  const isPlain = post.bodyFormat === "plain" || !post.bodyHtml;

  return (
    <article data-testid="post-content" className={`space-y-6 ${className || ""}`}>
      {/* 1. Editoryal Başlık (~68ch tipografi ölçeğinde) */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground font-serif leading-[1.2] selection:bg-primary/20">
        {post.title || "İsimsiz Gönderi"}
      </h1>

      {/* 2. Plan §10.2: Üreten Model / İstemci Rozeti */}
      {safeMetaItems.length > 0 && (
        <aside
          data-testid="post-metadata-badges"
          aria-label="İçerik meta bilgileri"
          className="flex items-center gap-2 flex-wrap text-xs pt-1"
        >
          {safeMetaItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                data-testid={`meta-badge-${item.key}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2/80 border border-border text-muted-foreground hover:text-foreground transition-colors shadow-2xs font-mono"
              >
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-semibold text-[11px]">{item.label}:</span>
                <span className="text-foreground font-medium">{item.value}</span>
              </div>
            );
          })}
        </aside>
      )}

      {/* 3. Post Gövdesi (Plan §0, §7 & §18.A): Sunucu sanitize etmiştir; ek sanitizasyon yok */}
      <div className="pt-2">
        {isPlain ? (
          <div
            data-testid="post-body-plain"
            className="reading-prose whitespace-pre-wrap font-sans text-foreground leading-relaxed selection:bg-primary/10"
          >
            {post.body}
          </div>
        ) : (
          <div
            data-testid="post-body-html"
            className="reading-prose text-foreground selection:bg-primary/10"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: backend guarantees safe HTML via pulldown-cmark + ammonia
            dangerouslySetInnerHTML={{ __html: post.bodyHtml as string }}
          />
        )}
      </div>
    </article>
  );
}
