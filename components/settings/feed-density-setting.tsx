"use client";

import { AlignJustify, PanelsTopLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { FeedDensityOption } from "@/components/feed/feed-nav";
import { getClientFeedDensity, setFeedDensityPreference } from "@/lib/feed-density";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function FeedDensitySetting() {
  const { t } = useTranslation();
  const [density, setDensity] = useState<FeedDensityOption>("card");

  useEffect(() => setDensity(getClientFeedDensity()), []);

  const options: Array<{
    value: FeedDensityOption;
    label: string;
    description: string;
    Icon: typeof PanelsTopLeft;
  }> = [
    {
      value: "card",
      label: t("settings.preferences.card"),
      description: t("settings.preferences.card_desc"),
      Icon: PanelsTopLeft,
    },
    {
      value: "compact",
      label: t("settings.preferences.compact"),
      description: t("settings.preferences.compact_desc"),
      Icon: AlignJustify,
    },
  ];

  return (
    <fieldset className="space-y-3" aria-label={t("settings.preferences.density")}>
      <legend className="text-sm font-semibold text-foreground">
        {t("settings.preferences.density")}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(({ value, label, description, Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={density === value}
            onClick={() => {
              setFeedDensityPreference(value);
              setDensity(value);
            }}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              density === value
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-surface-2/50",
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
