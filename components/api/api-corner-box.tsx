"use client";

import { Check, ChevronDown, ChevronUp, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface ApiCornerBoxProps {
  endpoint: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  apiUrl?: string;
  className?: string;
  variant?: "corner" | "inline";
  defaultOpen?: boolean;
  title?: string;
  description?: string;
}

export function ApiCornerBox({
  endpoint,
  method = "GET",
  apiUrl = process.env.NEXT_PUBLIC_ACTOS_API_URL || "https://api.actos.com.tr",
  className,
  variant = "inline",
  defaultOpen,
  title = "Bu sayfayı API'den al",
  description = "Actos'ta API saklanmaz, öğretilir. Bu sayfanın ham JSON verisini doğrudan çağırın:",
}: ApiCornerBoxProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? variant === "inline");
  const [copied, setCopied] = useState(false);

  // Normalize API URL and endpoint
  const normalizedApiUrl = apiUrl.replace(/\/$/, "");
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const curlCommand = `curl -s ${normalizedApiUrl}${normalizedEndpoint}`;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(curlCommand);
        setCopied(true);
        toast.success("cURL komutu panoya kopyalandı!");
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.info(`Komut: ${curlCommand}`);
      }
    } catch {
      toast.info(`Komut: ${curlCommand}`);
    }
  };

  const isCorner = variant === "corner";

  return (
    <aside
      data-testid="api-corner-box"
      aria-label="Bu sayfayı API'den al paneli"
      className={cn(
        isCorner && "fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-30 max-w-sm sm:max-w-md",
        className,
      )}
    >
      {!isOpen ? (
        // Collapsed view: minimalist trigger button
        <button
          type="button"
          data-testid="api-box-toggle"
          onClick={() => setIsOpen(true)}
          aria-expanded={false}
          className={cn(
            "group inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md px-3.5 py-2 text-xs font-mono text-foreground shadow-md hover:border-primary/60 hover:bg-surface-2 transition-all cursor-pointer",
            !isCorner && "w-full justify-between bg-surface-2/40 hover:bg-surface-2",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="w-3.5 h-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-foreground text-[11px] font-sans shrink-0">
              API
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-3 text-primary shrink-0">
              {method}
            </span>
            <span className="text-muted-foreground truncate text-[11px]">{normalizedEndpoint}</span>
          </div>
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      ) : (
        // Expanded view: full API endpoint info & curl command
        <section
          aria-label="Bu sayfayı API'den al"
          className={cn(
            "rounded-2xl border border-border/80 bg-surface-2/40 p-4 sm:p-5 space-y-3",
            isCorner && "bg-card/95 backdrop-blur-md shadow-xl border-border",
          )}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>{title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-3 text-muted-foreground">
                    Plan §10.1
                  </span>
                </h2>
                <p className="text-[11px] text-muted-foreground">{description}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div
                data-testid="api-endpoint-badge"
                className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-surface-2 border border-border text-foreground"
              >
                <span className="text-primary font-bold">{method}</span>
                <span className="text-muted-foreground">{normalizedEndpoint}</span>
              </div>

              {/* Collapse button */}
              <button
                type="button"
                data-testid="api-box-toggle"
                onClick={() => setIsOpen(false)}
                aria-label="API kutusunu daralt"
                aria-expanded={true}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Terminal Code and Copy Button */}
          <div className="relative group rounded-xl bg-card border border-border/90 p-3 font-mono text-xs overflow-x-auto flex items-center justify-between gap-4 shadow-2xs">
            <code
              data-testid="api-curl-code"
              className="text-foreground select-all text-[11px] sm:text-xs whitespace-nowrap"
            >
              {curlCommand}
            </code>

            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="api-copy-btn"
              onClick={handleCopy}
              aria-label="cURL komutunu kopyala"
              className="shrink-0 h-7 px-2.5 text-[11px] rounded-lg gap-1.5 transition-colors bg-surface-2 hover:bg-surface-3 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span className="text-success font-medium">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopyala</span>
                </>
              )}
            </Button>
          </div>
        </section>
      )}
    </aside>
  );
}
