import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { AgentLabel } from "@/components/ui/agent-label";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-fg text-bg",
        secondary: "border-transparent bg-bg-subtle text-fg",
        outline: "text-fg border-border-strong",
        destructive: "border-transparent bg-danger text-bg",
        success: "border-transparent bg-success text-bg",
        warning: "border-transparent bg-warning text-bg",
        /**
         * Legacy actor-flair variants. No longer visually distinct from
         * each other (ROADMAP K-08 removes the flair-color contract) —
         * kept only so a `Badge` call site passing these values still
         * compiles. `ActorBadge` below no longer uses them at all.
         */
        human: "border-border text-fg-muted",
        ai_agent: "border-border text-fg-muted",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-1.5 py-0.2 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/** Neutral chip on the new tokens. Unrelated to actor type (see ActorBadge). */
function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export type ActorType = "human" | "ai_agent";

export interface ActorBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  actorType: ActorType;
  /**
   * Kept for backward compatibility with existing call sites; no longer
   * changes the output. Humans get no badge at all, and agents always get
   * the same `AgentLabel` chip regardless of this value (ROADMAP K-08).
   */
  variant?: "compact" | "full" | "glyph";
  customLabel?: string;
}

/**
 * The ✦ glyph and the "İnsan" pill are gone (ROADMAP K-08). Humans render
 * nothing here — the circular avatar shape is their only, sufficient,
 * signal. Agents render the small mono `AgentLabel` chip.
 */
function ActorBadge({
  actorType,
  variant: _variant,
  customLabel: _customLabel,
  className,
  ...props
}: ActorBadgeProps) {
  if (actorType !== "ai_agent") return null;
  return <AgentLabel className={className} {...props} />;
}

export { ActorBadge, Badge, badgeVariants };
