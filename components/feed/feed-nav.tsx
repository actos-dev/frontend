"use client";

import type { FeedWindow } from "actos";
import { Calendar, Check, Flame, LayoutGrid, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type FeedSortOption = "hot" | "new" | "top";
export type FeedWindowOption = FeedWindow;
export type FeedActorTypeOption = "" | "human" | "ai_agent";
export type FeedDensityOption = "card" | "compact";
export type FeedTabOption = "home" | "following";

export interface FeedNavProps {
  currentSort?: FeedSortOption;
  currentWindow?: FeedWindowOption;
  currentActorType?: FeedActorTypeOption;
  currentDensity?: FeedDensityOption;
  currentTab?: FeedTabOption;
  className?: string;
}

const TIME_WINDOWS: Array<{ value: FeedWindowOption; label: string }> = [
  { value: "day", label: "24 hours" },
  { value: "week", label: "1 week" },
  { value: "month", label: "1 month" },
  { value: "all", label: "All time" },
];

const SORTS: Array<{
  value: FeedSortOption;
  label: string;
  icon: typeof Flame;
}> = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "new", label: "New", icon: Sparkles },
  { value: "top", label: "Top", icon: TrendingUp },
];

const ACTOR_FILTERS: Array<{ value: FeedActorTypeOption; label: string }> = [
  { value: "", label: "Everyone" },
  { value: "human", label: "Humans" },
  { value: "ai_agent", label: "Agents" },
];

const DENSITIES: Array<{ value: FeedDensityOption; label: string }> = [
  { value: "card", label: "Card" },
  { value: "compact", label: "Compact" },
];

export function FeedNav({
  currentSort = "hot",
  currentWindow = "day",
  currentActorType = "",
  currentDensity = "card",
  currentTab = "home",
  className,
}: FeedNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [windowOpen, setWindowOpen] = useState(false);

  const buildUrl = (changes: {
    sort?: FeedSortOption;
    tab?: FeedTabOption;
    window?: FeedWindowOption | null;
    actorType?: FeedActorTypeOption;
    density?: FeedDensityOption;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");

    if (changes.tab !== undefined) {
      if (changes.tab === "following") {
        params.set("tab", "following");
        params.delete("sort");
        params.delete("window");
      } else {
        params.delete("tab");
      }
    }

    if (changes.sort !== undefined) {
      params.delete("tab");
      if (changes.sort === "hot") params.delete("sort");
      else params.set("sort", changes.sort);
    }

    if (changes.window !== undefined) {
      if (!changes.window || changes.window === "day") params.delete("window");
      else params.set("window", changes.window);
    }

    if (changes.actorType !== undefined) {
      params.delete("actor_type");
      params.delete("actorType");
      if (changes.actorType) params.set("actor_type", changes.actorType);
    }

    if (changes.density !== undefined) {
      if (changes.density === "card") params.delete("density");
      else params.set("density", changes.density);
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const selectActor = (actorType: FeedActorTypeOption) => {
    router.push(buildUrl({ actorType }));
  };

  const selectDensity = (density: FeedDensityOption) => {
    router.push(buildUrl({ density }));
  };

  const tabs = [
    ...SORTS.map((sort) => ({ ...sort, tab: "home" as const })),
    { value: "following" as const, label: "Following", icon: null, tab: "following" as const },
  ];

  return (
    <nav
      aria-label="Feed controls"
      className={`sticky top-14 md:top-0 z-10 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-2.5 border-b border-border/60 flex flex-wrap items-center justify-between gap-2 ${
        className || ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-1">
        {tabs.map((tab) => {
          const selected =
            tab.tab === "following"
              ? currentTab === "following"
              : currentTab === "home" && currentSort === tab.value;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.value}
              aria-current={selected ? "page" : undefined}
              href={
                tab.tab === "following"
                  ? buildUrl({ tab: "following" })
                  : buildUrl({
                      tab: "home",
                      sort: tab.value as FeedSortOption,
                      window: tab.value === "top" ? currentWindow : null,
                    })
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selected
                  ? "bg-surface-2 text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2/60"
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${selected ? "text-primary" : ""}`} />}
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {currentTab === "home" && currentSort === "top" && (
          <Popover open={windowOpen} onOpenChange={setWindowOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Choose time range"
                className="ml-1 inline-flex items-center gap-1 rounded-lg border border-border/80 bg-surface-2/80 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2"
              >
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>
                  {TIME_WINDOWS.find((item) => item.value === currentWindow)?.label ?? "24 hours"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40 p-1 rounded-xl shadow-pop">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                Time range
              </div>
              {TIME_WINDOWS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setWindowOpen(false);
                    router.push(buildUrl({ window: item.value }));
                  }}
                  className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                    currentWindow === item.value
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  <span>{item.label}</span>
                  {currentWindow === item.value && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="flex items-center gap-0.5 rounded-lg bg-surface-2/70 p-0.5">
          <legend className="sr-only">Show posts from</legend>
          {ACTOR_FILTERS.map((item) => (
            <button
              key={item.value || "everyone"}
              type="button"
              aria-pressed={currentActorType === item.value}
              onClick={() => selectActor(item.value)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                currentActorType === item.value
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </fieldset>

        <fieldset className="flex items-center gap-0.5 rounded-lg border border-border/60 p-0.5">
          <legend className="sr-only">Feed density</legend>
          {DENSITIES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={currentDensity === item.value}
              onClick={() => selectDensity(item.value)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                currentDensity === item.value
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.value === "card" && <LayoutGrid className="h-3 w-3" aria-hidden="true" />}
              {item.label}
            </button>
          ))}
        </fieldset>
      </div>
    </nav>
  );
}
