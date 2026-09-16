import type { Post } from "actos";
import { CodeBlockEnhancer } from "@/components/render/code-block-enhancer";
import { cn } from "@/lib/utils";

export interface PostContentProps {
  post: Post;
  /**
   * Already rendered by `renderContent` (lib/render), one level up — this
   * component never touches Markdown itself, so it can stay a plain,
   * synchronous component regardless of what renders it.
   */
  bodyHtml: string;
  className?: string;
}

export function PostContent({ post, bodyHtml, className }: PostContentProps) {
  return (
    <article data-testid="post-content" className={cn("space-y-6", className)}>
      {/* 1. Editorial title (Newsreader, ~68ch measure) */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground font-serif leading-[1.2] selection:bg-primary/20">
        {post.title || "İsimsiz Gönderi"}
      </h1>

      {/* 2. Post body: rendered by lib/render, already sanitized there. */}
      <div className="pt-2">
        <CodeBlockEnhancer>
          <div
            data-testid="post-body"
            className="prose selection:bg-primary/10"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered and sanitized by lib/render (rehype-sanitize), not raw API HTML
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </CodeBlockEnhancer>
      </div>
    </article>
  );
}
