import type * as React from "react";
import { cn } from "@/lib/utils";

export interface SkipToContentProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId?: string;
  label?: string;
}

/**
 * SkipToContent component
 * Allows keyboard users and screen readers to skip past repetitive navigation
 * directly to the primary content area (#main-content).
 * Visually hidden until focused via Tab.
 */
export function SkipToContent({
  targetId = "main-content",
  label = "Ana içeriğe atla",
  className,
  ...props
}: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      data-testid="skip-to-content"
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:fixed focus:top-4 focus:left-4 focus:z-50",
        "focus:px-4 focus:py-2.5 focus:rounded-lg focus:shadow-lg",
        "focus:bg-primary focus:text-primary-foreground focus:font-semibold focus:text-sm",
        "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        "transition-transform select-none cursor-pointer",
        className,
      )}
      {...props}
    >
      {label}
    </a>
  );
}
