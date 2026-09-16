"use client";

import { Compass, CornerDownLeft, Keyboard, Zap } from "lucide-react";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";

export interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  descriptionKey: string;
}

interface ShortcutSection {
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ShortcutItem[];
}

/**
 * ROADMAP.md S-05: `j`/`k`, `o`/`Enter`, `c`, `/`, `?` and `Escape` only.
 * The `g`-chord navigation is gone (ROADMAP K-11) — the left nav already
 * reaches every one of those destinations in a single click.
 */
const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    titleKey: "shortcuts.sectionNavigation",
    icon: Compass,
    items: [
      { keys: ["j"], descriptionKey: "shortcuts.next" },
      { keys: ["k"], descriptionKey: "shortcuts.prev" },
      { keys: ["o", "Enter"], descriptionKey: "shortcuts.open" },
      { keys: ["/"], descriptionKey: "shortcuts.search" },
      { keys: ["Esc"], descriptionKey: "shortcuts.escape" },
    ],
  },
  {
    titleKey: "shortcuts.sectionActions",
    icon: Zap,
    items: [
      { keys: ["c"], descriptionKey: "shortcuts.compose" },
      { keys: ["u"], descriptionKey: "shortcuts.upvote" },
      { keys: ["s"], descriptionKey: "shortcuts.save" },
      { keys: ["?"], descriptionKey: "shortcuts.toggleHelp" },
    ],
  },
];

function KeyBadge({ keyText }: { keyText: string }) {
  if (keyText === "Enter") {
    return (
      <kbd className="inline-flex items-center justify-center gap-1 min-w-[32px] h-6 px-1.5 text-[11px] font-mono font-semibold rounded-md bg-bg-subtle border border-border text-fg shadow-2xs">
        <CornerDownLeft className="w-3 h-3" />
        <span>Enter</span>
      </kbd>
    );
  }

  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 text-[11px] font-mono font-semibold rounded-md bg-bg-subtle border border-border text-fg shadow-2xs">
      {keyText === "Esc" ? "Esc" : keyText}
    </kbd>
  );
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="shortcuts-dialog"
        className="max-w-md sm:max-w-lg p-5 sm:p-6 bg-bg border-border rounded-2xl shadow-pop overflow-hidden"
      >
        <DialogHeader className="space-y-1.5 text-left border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-accent" aria-hidden="true" />
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold font-serif text-fg">
                {t("shortcuts.title")}
              </DialogTitle>
              <DialogDescription className="text-xs text-fg-muted">
                {t("shortcuts.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.titleKey} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted flex items-center gap-1.5">
                  <SectionIcon className="w-3.5 h-3.5 text-accent" />
                  <span>{t(section.titleKey)}</span>
                </h3>

                <div className="rounded-xl border border-border divide-y divide-border text-xs">
                  {section.items.map((item) => (
                    <div
                      key={item.descriptionKey}
                      className="flex items-center justify-between py-2 px-3 gap-3"
                    >
                      <span className="text-fg text-[12px]">{t(item.descriptionKey)}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, idx) => (
                          <React.Fragment key={k}>
                            {idx > 0 && (
                              <span className="text-fg-subtle text-[10px]">
                                {t("shortcuts.or")}
                              </span>
                            )}
                            <KeyBadge keyText={k} />
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
