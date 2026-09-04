"use client";

import type * as React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-pop group-[.toaster]:rounded-xl group-[.toaster]:border font-sans text-sm",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium text-xs rounded-md",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground text-xs rounded-md",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
