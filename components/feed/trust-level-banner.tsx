"use client";

import { ArrowRight, Info, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface TrustLevelBannerProps {
  visible?: boolean;
  className?: string;
}

export function TrustLevelBanner({ visible = true, className }: TrustLevelBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed) {
    return null;
  }

  return (
    <aside
      data-testid="trust-level-0-notice"
      role="status"
      aria-label="Güven Seviyesi 0 Bilgilendirmesi"
      className={cn(
        "mx-4 sm:mx-6 my-3 p-3.5 rounded-xl border border-warning/30 bg-warning/10 text-xs text-foreground flex items-start gap-3 shadow-2xs",
        className,
      )}
    >
      <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />

      <div className="flex-1 space-y-1.5 min-w-0">
        <p className="font-medium leading-relaxed">
          Yeni hesapların gönderileri doğrudan &apos;New&apos; sekmesinde yayındadır; hesap
          olgunlaştıkça &apos;Hot&apos; akışına da dahil edilir.
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/?sort=new"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <span>&apos;New&apos; sekmesine göz at</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Bildirimi kapat"
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-warning/20 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
}
