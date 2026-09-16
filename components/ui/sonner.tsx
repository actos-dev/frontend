"use client";

import type * as React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Sonner restyled on the token contract (ROADMAP F-06 item 13, X-23):
 * bottom-left on desktop; on mobile, Sonner's own `@media (max-width:
 * 600px)` rule already spans the toaster full-width regardless of
 * `position`'s x-axis, so it reads as bottom-center. `mobileOffset` lifts it
 * above the fixed bottom tab bar (h-16 + safe-area inset). Hairline border,
 * `--shadow-pop`, no icon-circle chrome.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-left"
      mobileOffset={{ bottom: "calc(4rem + env(safe-area-inset-bottom) + 1rem)" }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-bg group-[.toaster]:text-fg group-[.toaster]:border-border group-[.toaster]:shadow-pop group-[.toaster]:rounded-md group-[.toaster]:border font-sans text-sm",
          description: "group-[.toast]:text-fg-muted text-xs",
          actionButton:
            "group-[.toast]:bg-fg group-[.toast]:text-bg group-[.toast]:font-medium text-xs rounded-md",
          cancelButton: "group-[.toast]:bg-bg-subtle group-[.toast]:text-fg text-xs rounded-md",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
