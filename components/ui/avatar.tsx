"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import Image from "next/image";
import * as React from "react";
import type { ActorType } from "@/components/ui/badge";
import { getAvatarTintColor } from "@/lib/avatar-tint";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-bg-subtle",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

export interface AvatarImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  /** Rendered sizes hint for the optimizer; avatars are small, so keep it tight. */
  sizes?: string;
}

/**
 * `next/image` under the same `Avatar.Root` as `AvatarFallback` (ROADMAP D-04).
 * Radix's own `Image` was a bare `<img>`; swapping it for the optimizer keeps
 * the fill/object-cover look while the fallback stays deterministic initials.
 *
 * `fill` positions the image over the fallback (which stays mounted because no
 * Radix image ever reports "loaded"), and `onError` unmounts the image so the
 * initials show whenever the media host fails.
 */
const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt = "", className, sizes = "96px" }, ref) => {
    // Track which source failed instead of a boolean, so a new `src` starts
    // fresh without an effect (the failed source is simply no longer current).
    const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
    const failed = src != null && failedSrc === src;

    if (!src || failed) return null;

    return (
      <Image
        ref={ref}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        onError={() => setFailedSrc(src)}
        className={cn("aspect-square object-cover", className)}
      />
    );
  },
);
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center bg-bg-subtle text-xs font-semibold text-fg uppercase select-none",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export interface AvatarActorBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  actorType: ActorType;
  size?: "sm" | "default" | "lg" | "xl";
}

/**
 * Overlay icon badge that used to sit on the corner of an avatar to signal
 * actor type. Intentionally a no-op now (ROADMAP K-08): the avatar's own
 * shape (circle for humans, squircle for agents — see `ActorAvatar` below)
 * carries that signal structurally instead of a colored icon, so this
 * component renders nothing. Kept only so the ~10 existing call sites keep
 * compiling until they migrate to `ActorAvatar`.
 */
function AvatarActorBadge(_props: AvatarActorBadgeProps) {
  return null;
}

export type ActorAvatarSize = 20 | 28 | 40 | 88;

export interface ActorAvatarProps {
  actorType: ActorType;
  username: string;
  displayName?: string;
  src?: string | null;
  size?: ActorAvatarSize;
  className?: string;
}

const ACTOR_AVATAR_DIMENSION_CLASSES: Record<ActorAvatarSize, string> = {
  20: "h-5 w-5",
  28: "h-7 w-7",
  40: "h-10 w-10",
  88: "h-[88px] w-[88px]",
};

const ACTOR_AVATAR_TEXT_CLASSES: Record<ActorAvatarSize, string> = {
  20: "text-[10px]",
  28: "text-xs",
  40: "text-base",
  88: "text-2xl",
};

/** One initial at the smallest size, two above it (ROADMAP §1.2 Avatars). */
function getActorInitials(name: string, size: ActorAvatarSize): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (size <= 20) return trimmed[0]?.toUpperCase() ?? "?";

  const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const [first, second] = parts;
    return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * The brand-defining avatar primitive (ROADMAP §1.1 rule 4, F-06 item 5).
 * Shape derives from `actorType`: humans get a circle, agents get a
 * squircle (28% radius) — never color alone. The fallback is initials on a
 * tint deterministically derived from the username (see `lib/avatar-tint`),
 * with `--fg` text so it stays legible across all three themes.
 */
export function ActorAvatar({
  actorType,
  username,
  displayName,
  src,
  size = 40,
  className,
}: ActorAvatarProps) {
  const label = displayName || username;
  const shapeClassName = actorType === "ai_agent" ? "rounded-[28%]" : "rounded-full";

  return (
    <Avatar
      className={cn(shapeClassName, ACTOR_AVATAR_DIMENSION_CLASSES[size], className)}
      data-actor-type={actorType}
    >
      {src ? <AvatarImage src={src} alt={label} /> : null}
      <AvatarFallback
        className={cn("font-semibold", ACTOR_AVATAR_TEXT_CLASSES[size])}
        style={{ backgroundColor: getAvatarTintColor(username) }}
      >
        {getActorInitials(label, size)}
      </AvatarFallback>
    </Avatar>
  );
}

export { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage };
