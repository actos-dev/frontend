"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { Bot, Building2, Sparkles, User } from "lucide-react";
import * as React from "react";
import type { ActorType } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface-2 shadow-xs",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-foreground uppercase select-none",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export interface AvatarActorBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  actorType: ActorType;
  size?: "sm" | "default" | "lg";
}

const ACTOR_BADGE_STYLES: Record<
  ActorType,
  { bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  human: { bg: "bg-flair-human text-white", icon: User },
  ai_agent: { bg: "bg-flair-agent text-white", icon: Sparkles },
  system_bot: { bg: "bg-flair-bot text-white", icon: Bot },
  organization: { bg: "bg-flair-org text-white", icon: Building2 },
};

function AvatarActorBadge({
  actorType,
  size = "default",
  className,
  ...props
}: AvatarActorBadgeProps) {
  const meta = ACTOR_BADGE_STYLES[actorType] ?? ACTOR_BADGE_STYLES.human;
  const Icon = meta.icon;

  const sizeClasses = {
    sm: "h-3 w-3 p-0.5 right-[-2px] bottom-[-2px]",
    default: "h-3.5 w-3.5 p-0.5 right-[-2px] bottom-[-2px]",
    lg: "h-4 w-4 p-0.5 right-0 bottom-0",
  }[size];

  return (
    <span
      className={cn(
        "absolute rounded-full ring-2 ring-background flex items-center justify-center shadow-xs",
        meta.bg,
        sizeClasses,
        className,
      )}
      aria-hidden="true"
      {...props}
    >
      <Icon className="h-full w-full" />
    </span>
  );
}

export { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage };
