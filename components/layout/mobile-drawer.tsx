"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileDrawer({ open, onOpenChange }: MobileDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Karartma / Arka Plan Katmanı */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-overlay/60 backdrop-blur-xs",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />

        {/* Soldan Kayan Çekmece İçeriği */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-background border-r border-border shadow-pop duration-200 outline-hidden flex flex-col",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          )}
        >
          <div className="flex items-center justify-between p-3 border-b border-border/70">
            <DialogPrimitive.Title className="text-sm font-semibold text-foreground px-2">
              Menü
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Menüyü Kapat"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Sidebar onNavigate={() => onOpenChange(false)} className="py-2 border-r-0" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
