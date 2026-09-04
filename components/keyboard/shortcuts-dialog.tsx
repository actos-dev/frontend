"use client";

import { Command, Compass, CornerDownLeft, EyeOff, Keyboard, Zap } from "lucide-react";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ShortcutItem[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: "Gezinme",
    icon: Compass,
    items: [
      { keys: ["j"], description: "Akışta sonraki gönderiyi seç" },
      { keys: ["k"], description: "Akışta önceki gönderiyi seç" },
      { keys: ["o", "Enter"], description: "Seçili gönderiyi aç" },
      { keys: ["/"], description: "Arama çubuğuna odaklan" },
      { keys: ["Esc"], description: "Seçimi kaldır veya pencereyi kapat" },
    ],
  },
  {
    title: "Eylemler",
    icon: Zap,
    items: [
      { keys: ["u"], description: "Seçili gönderiye yukarı oy ver" },
      { keys: ["s"], description: "Seçili gönderiyi kaydet / kaydı kaldır" },
      { keys: ["?"], description: "Bu kısayol yardım penceresini aç / kapat" },
    ],
  },
  {
    title: "Sayfalar (Kombinasyon)",
    icon: Command,
    items: [
      { keys: ["g", "h"], description: "Ana akışa git" },
      { keys: ["g", "s"], description: "Kaydedilenler sayfasına git" },
      { keys: ["g", "n"], description: "Yeni gönderi oluşturmaya git" },
    ],
  },
];

function KeyBadge({ keyText }: { keyText: string }) {
  let content = keyText;
  if (keyText === "Enter") {
    return (
      <kbd className="inline-flex items-center justify-center gap-1 min-w-[32px] h-6 px-1.5 text-[11px] font-mono font-semibold rounded-md bg-surface-2 border border-border text-foreground shadow-2xs">
        <CornerDownLeft className="w-3 h-3" />
        <span>Enter</span>
      </kbd>
    );
  }
  if (keyText === "Esc") {
    content = "Esc";
  }

  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 text-[11px] font-mono font-semibold rounded-md bg-surface-2 border border-border text-foreground shadow-2xs">
      {content}
    </kbd>
  );
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="shortcuts-dialog"
        className="max-w-md sm:max-w-lg p-5 sm:p-6 bg-card border-border rounded-2xl shadow-xl overflow-hidden"
      >
        <DialogHeader className="space-y-1.5 text-left border-b border-border/70 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold font-serif text-foreground">
                Klavye Kısayolları
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Actos'ta fareye dokunmadan klavye-öncelikli olarak gezinebilirsiniz.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Kısayol Grupları */}
        <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <SectionIcon className="w-3.5 h-3.5 text-primary" />
                  <span>{section.title}</span>
                </h3>

                <div className="rounded-xl border border-border/70 bg-surface-2/30 divide-y divide-border/50 text-xs">
                  {section.items.map((item) => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between py-2 px-3 gap-3"
                    >
                      <span className="text-foreground text-[12px]">{item.description}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((k, idx) => (
                          <React.Fragment key={k}>
                            {idx > 0 && (
                              <span className="text-muted-foreground text-[10px]">veya</span>
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

        {/* Kritik Kural Bilgilendirmesi */}
        <div className="pt-3 border-t border-border/70 flex items-start gap-2 text-[11px] text-muted-foreground bg-surface-2/40 -mx-6 -mb-6 p-4">
          <EyeOff className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong className="text-foreground font-semibold">Form Koruması:</strong> Bir metin
            alanına (<code className="font-mono text-foreground">input</code>,{" "}
            <code className="font-mono text-foreground">textarea</code>) odaklandığınızda tüm
            kısayollar otomatik olarak devre dışı kalır.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
