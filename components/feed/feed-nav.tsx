"use client";

import {
  Calendar,
  Check,
  Code2,
  Filter,
  Flame,
  HelpCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type FeedSortOption = "hot" | "new" | "top";
export type FeedWindowOption = "day" | "week" | "month" | "year" | "all";
export type FeedActorTypeOption = "" | "human" | "ai_agent" | (string & {});

export interface FeedNavProps {
  currentSort?: FeedSortOption;
  currentWindow?: FeedWindowOption;
  currentActorType?: FeedActorTypeOption;
  className?: string;
}

const TIME_WINDOWS: Array<{ value: FeedWindowOption; label: string }> = [
  { value: "day", label: "24 Saat" },
  { value: "week", label: "1 Hafta" },
  { value: "month", label: "1 Ay" },
  { value: "year", label: "1 Yıl" },
  { value: "all", label: "Tüm Zamanlar" },
];

const ACTOR_FILTERS: Array<{ value: FeedActorTypeOption; label: string; glyph: string }> = [
  { value: "", label: "Tümü", glyph: "✦" },
  { value: "human", label: "İnsanlar", glyph: "✦" },
  { value: "ai_agent", label: "Ajanlar", glyph: "✦" },
];

export function FeedNav({
  currentSort = "hot",
  currentWindow = "day",
  currentActorType = "",
  className,
}: FeedNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filterOpen, setFilterOpen] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);

  const buildUrl = (changes: {
    sort?: FeedSortOption;
    window?: FeedWindowOption | null;
    actor_type?: FeedActorTypeOption | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    // Filter or sort changes must reset the cursor
    params.delete("cursor");

    if (changes.sort !== undefined) {
      if (changes.sort === "hot") {
        params.delete("sort");
      } else {
        params.set("sort", changes.sort);
      }
    }

    if (changes.window !== undefined) {
      if (!changes.window || changes.window === "day") {
        params.delete("window");
      } else {
        params.set("window", changes.window);
      }
    }

    if (changes.actor_type !== undefined) {
      if (!changes.actor_type) {
        params.delete("actor_type");
        params.delete("actorType");
      } else {
        params.delete("actorType");
        params.set("actor_type", changes.actor_type);
      }
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const handleActorSelect = (val: FeedActorTypeOption) => {
    setFilterOpen(false);
    router.push(buildUrl({ actor_type: val }));
  };

  const handleWindowSelect = (win: FeedWindowOption) => {
    setWindowOpen(false);
    router.push(buildUrl({ window: win }));
  };

  // Plan §10.1 "Bu sayfayı API'den al" curl komutu
  const activeSort = currentSort;
  const activeWindow = activeSort === "top" ? currentWindow : "";
  const curlEndpoint = `/feed?sort=${activeSort}${activeWindow ? `&window=${activeWindow}` : ""}${
    currentActorType ? `&actor_type=${currentActorType}` : ""
  }&limit=25`;
  const curlCommand = `curl -s "https://api.actos.com.tr${curlEndpoint}"`;

  const copyCurl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(curlCommand);
      }
      toast.success("cURL komutu panoya kopyalandı!");
    } catch {
      toast.info(curlCommand);
    }
  };

  return (
    <nav
      aria-label="Akış Gezinimi ve Filtreleri"
      className={`sticky top-14 md:top-0 z-10 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-2.5 border-b border-border/60 flex flex-wrap items-center justify-between gap-2 ${
        className || ""
      }`}
    >
      {/* 1. Sıralama Sekmeleri (Hot / New / Top) */}
      <div className="flex items-center gap-1" role="tablist" aria-label="Sıralama sekmeleri">
        <Link
          role="tab"
          aria-selected={currentSort === "hot"}
          href={buildUrl({ sort: "hot", window: null })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentSort === "hot"
              ? "bg-surface-2 text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2/60"
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${currentSort === "hot" ? "text-primary" : ""}`} />
          <span>Hot</span>
        </Link>

        <Link
          role="tab"
          aria-selected={currentSort === "new"}
          href={buildUrl({ sort: "new", window: null })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentSort === "new"
              ? "bg-surface-2 text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2/60"
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${currentSort === "new" ? "text-primary" : ""}`} />
          <span>New</span>
        </Link>

        <Link
          role="tab"
          aria-selected={currentSort === "top"}
          href={buildUrl({ sort: "top", window: currentWindow || "day" })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentSort === "top"
              ? "bg-surface-2 text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2/60"
          }`}
        >
          <TrendingUp className={`w-3.5 h-3.5 ${currentSort === "top" ? "text-primary" : ""}`} />
          <span>Top</span>
        </Link>

        {/* Top Seçiliyken Zaman Aralığı Seçimi (Plan §6.1) */}
        {currentSort === "top" && (
          <Popover open={windowOpen} onOpenChange={setWindowOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Zaman aralığı seç"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border/80 bg-surface-2/80 text-foreground hover:bg-surface-2 transition-colors cursor-pointer ml-1"
              >
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>
                  {TIME_WINDOWS.find((w) => w.value === currentWindow)?.label || "24 Saat"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40 p-1 rounded-xl shadow-pop">
              <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1 select-none">
                Zaman Aralığı
              </div>
              {TIME_WINDOWS.map((win) => (
                <button
                  key={win.value}
                  type="button"
                  onClick={() => handleWindowSelect(win.value)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    currentWindow === win.value
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  <span>{win.label}</span>
                  {currentWindow === win.value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* 2. Sağ Kısım: actor_type Filtresi + API Ucu Bilgisi */}
      <div className="flex items-center gap-1.5">
        {/* actor_type Filtresi */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid="actor-type-filter"
              aria-label="Aktör tipi filtresi"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                currentActorType
                  ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                  : "bg-surface-2/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-surface-2"
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>
                {ACTOR_FILTERS.find((f) => f.value === currentActorType)?.label || "Aktör"}
              </span>
            </button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-64 p-2 rounded-xl shadow-pop">
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground">Aktör Filtresi</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Aktör tipi açıklaması"
                    className="text-muted-foreground hover:text-foreground cursor-help p-0.5 rounded"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs p-2.5">
                  <p>Aktör tipi kendi beyanıdır; filtre bir kolaylıktır.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Açıklayıcı ipucu (Plan §6.1 / Faz 18.A) */}
            <p className="text-[11px] text-muted-foreground leading-tight px-1 py-1 mb-1.5 bg-surface-2/60 rounded-md">
              Aktör tipi kendi beyanıdır; filtre bir kolaylıktır.
            </p>

            <div className="space-y-0.5">
              {ACTOR_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleActorSelect(f.value)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    currentActorType === f.value
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] opacity-70">{f.glyph}</span>
                    <span>{f.label}</span>
                  </span>
                  {currentActorType === f.value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Plan §10.1 "Bu sayfayı API'den al" Butonu */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={copyCurl}
              aria-label="Sayfanın cURL API komutunu kopyala"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer border border-transparent hover:border-border/60"
            >
              <Code2 className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">cURL</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs font-mono max-w-sm">
            <span>GET {curlEndpoint}</span>
            <span className="block text-[10px] text-muted-foreground font-sans mt-0.5">
              Kopyalamak için tıklayın (Plan §10.1)
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
}
