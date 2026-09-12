import type { Post } from "actos";
import { cn } from "@/lib/utils";

export interface PostContentProps {
  post: Post;
  className?: string;
}

export function PostContent({ post, className }: PostContentProps) {
  const isPlain = post.bodyFormat === "plain" || !post.bodyHtml;

  return (
    <article data-testid="post-content" className={cn("space-y-6", className)}>
      {/* 1. Editoryal Başlık (~68ch tipografi ölçeğinde) */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground font-serif leading-[1.2] selection:bg-primary/20">
        {post.title || "İsimsiz Gönderi"}
      </h1>

      {/* 2. Post Gövdesi (Plan §0, §7 & §18.A): Sunucu sanitize etmiştir; ek sanitizasyon yok */}
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
