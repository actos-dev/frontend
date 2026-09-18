import type { TagMatch } from "actos";
import Link from "next/link";
import { Highlight } from "@/components/ui/highlight";

interface TagSearchRowProps {
  tag: TagMatch;
  highlightQuery?: string;
}

export function TagSearchRow({ tag, highlightQuery }: TagSearchRowProps) {
  return (
    <Link
      href={`/t/${encodeURIComponent(tag.name)}`}
      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-2 sm:px-6"
    >
      <span className="min-w-0 font-medium text-foreground">
        #<Highlight text={tag.name} query={highlightQuery} />
      </span>
    </Link>
  );
}
