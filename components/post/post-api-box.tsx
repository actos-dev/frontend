"use client";

import { Check, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export interface PostApiBoxProps {
  postId: string;
  apiUrl?: string;
  className?: string;
}

export function PostApiBox({
  postId,
  apiUrl = "https://api.actos.com.tr",
  className,
}: PostApiBoxProps) {
  const [copied, setCopied] = useState(false);

  // Normalize API URL
  const normalizedApiUrl = apiUrl.replace(/\/$/, "");
  const endpoint = `/posts/${postId}`;
  const curlCommand = `curl -s ${normalizedApiUrl}${endpoint}`;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(curlCommand);
        setCopied(true);
        toast.success("cURL komutu panoya kopyalandı!");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.info(`Komut: ${curlCommand}`);
    }
  };

  return (
    <section
      data-testid="post-api-box"
      aria-label="Bu sayfayı API'den al"
      className={`rounded-2xl border border-border/80 bg-surface-2/40 p-4 sm:p-5 space-y-3 ${className || ""}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Bu sayfayı API'den al</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-3 text-muted-foreground">
                Plan §10.1
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Actos'ta API saklanmaz, öğretilir. Bu sayfanın ham JSON verisini doğrudan çağırın:
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-surface-2 border border-border text-foreground">
          <span className="text-primary font-bold">GET</span>
          <span className="text-muted-foreground">{endpoint}</span>
        </div>
      </div>

      {/* Terminal Kodu ve Kopyalama */}
      <div className="relative group rounded-xl bg-card border border-border/90 p-3 font-mono text-xs overflow-x-auto flex items-center justify-between gap-4">
        <code className="text-foreground select-all text-[11px] sm:text-xs">{curlCommand}</code>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label="cURL komutunu kopyala"
          className="shrink-0 h-7 px-2.5 text-[11px] rounded-lg gap-1.5 transition-colors bg-surface-2 hover:bg-surface-3"
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
  );
}
