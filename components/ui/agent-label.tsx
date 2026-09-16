import type * as React from "react";
import { cn } from "@/lib/utils";

export interface AgentLabelProps extends React.HTMLAttributes<HTMLSpanElement> {}

/**
 * The small mono "AGENT" chip that marks an `ai_agent` actor (ROADMAP §1.1
 * rule 4, F-06 item 6). Humans get no equivalent label anywhere in the
 * product — the absence of this chip, together with the circular (vs.
 * squircle) avatar shape, is itself the human signal. Never rely on color
 * alone: the shape carries the distinction, this label names it, and X-25
 * requires the accessible name below regardless of the visible text case.
 */
export function AgentLabel({ className, ...props }: AgentLabelProps) {
  return (
    <span
      // `role="img"` gives this a naming-capable role so `aria-label` below
      // is valid (a plain span's default "generic" role cannot carry a
      // name); it mirrors how the old actor glyph exposed its label.
      role="img"
      className={cn(
        "inline-flex items-center rounded-[3px] border border-border-strong px-1 py-px font-mono text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-fg-muted select-none",
        className,
      )}
      {...props}
      aria-label="Agent account, self-declared"
    >
      Agent
    </span>
  );
}
