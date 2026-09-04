import { cva, type VariantProps } from "class-variance-authority";
import { Bot, Building2, Sparkles, User } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "text-foreground border-border",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        /* Actos Actor Flair Variants */
        human: "border-flair-human/30 bg-flair-human/10 text-flair-human hover:bg-flair-human/20",
        ai_agent:
          "border-flair-agent/30 bg-flair-agent/10 text-flair-agent hover:bg-flair-agent/20",
        system_bot: "border-flair-bot/30 bg-flair-bot/10 text-flair-bot hover:bg-flair-bot/20",
        organization: "border-flair-org/30 bg-flair-org/10 text-flair-org hover:bg-flair-org/20",
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

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export type ActorType = "human" | "ai_agent" | "system_bot" | "organization";

export interface ActorBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  actorType: ActorType;
  /**
   * "compact": Yalnızca ikon (Küçük rozet)
   * "glyph": Yalnızca metin glifi: ✦, 🤖 vb. (Feed için tarama konforu, Plan §7.3)
   * "full": Glif + etiket metni (Post ve profil sayfası)
   */
  variant?: "compact" | "full" | "glyph";
  customLabel?: string;
}

export const ACTOR_GLYPHS: Record<ActorType, string> = {
  human: "✦",
  ai_agent: "✦",
  system_bot: "🤖",
  organization: "🏢",
};

const ACTOR_CONFIG: Record<
  ActorType,
  {
    label: string;
    glyph: string;
    icon: React.ComponentType<{ className?: string }>;
    variant: "human" | "ai_agent" | "system_bot" | "organization";
  }
> = {
  human: {
    label: "İnsan",
    glyph: "✦",
    icon: User,
    variant: "human",
  },
  ai_agent: {
    label: "AI agent",
    glyph: "✦",
    icon: Sparkles,
    variant: "ai_agent",
  },
  system_bot: {
    label: "Bot",
    glyph: "🤖",
    icon: Bot,
    variant: "system_bot",
  },
  organization: {
    label: "Kurum",
    glyph: "🏢",
    icon: Building2,
    variant: "organization",
  },
};

function ActorBadge({
  actorType,
  variant = "full",
  customLabel,
  className,
  ...props
}: ActorBadgeProps) {
  const config = ACTOR_CONFIG[actorType] ?? ACTOR_CONFIG.human;
  const Icon = config.icon;
  const label = customLabel || config.label;

  if (variant === "glyph") {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center font-mono font-bold select-none text-xs",
          config.variant === "human" && "text-flair-human",
          config.variant === "ai_agent" && "text-flair-agent",
          config.variant === "system_bot" && "text-flair-bot",
          config.variant === "organization" && "text-flair-org",
          className,
        )}
        title={label}
        {...props}
      >
        {config.glyph}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-0.5 border transition-colors",
          badgeVariants({ variant: config.variant, size: "sm" }),
          className,
        )}
        title={label}
        {...props}
      >
        <Icon className="h-3 w-3" />
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors select-none",
        badgeVariants({ variant: config.variant }),
        className,
      )}
      {...props}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export { ActorBadge, Badge, badgeVariants };
