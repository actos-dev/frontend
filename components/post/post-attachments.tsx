"use client";

import type { Attachment } from "actos";
import { Download, ExternalLink, ImageIcon, Maximize2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface PostAttachmentsProps {
  attachments?: Attachment[] | null;
  thumbnailUrl?: string | null;
  className?: string;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

export function PostAttachments({ attachments, thumbnailUrl, className }: PostAttachmentsProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Filter image attachments
  const imageAttachments = (attachments || []).filter(
    (att) =>
      att.url &&
      (att.mimeType?.startsWith("image/") ||
        /\.(webp|png|jpe?g|gif|svg)$/i.test(att.url) ||
        Boolean(att.thumbnailUrl)),
  );

  // If no image attachments but a thumbnailUrl is provided
  const hasOnlyThumbnail = imageAttachments.length === 0 && Boolean(thumbnailUrl);

  if (imageAttachments.length === 0 && !hasOnlyThumbnail) {
    return null;
  }

  return (
    <section
      data-testid="post-attachments"
      aria-label="Görsel Ekleri"
      className={`space-y-3 pt-4 pb-2 ${className || ""}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ImageIcon className="w-3.5 h-3.5 text-primary" />
        <span>Ekler ({hasOnlyThumbnail ? 1 : imageAttachments.length})</span>
      </div>

      {/* Standalone Thumbnail */}
      {hasOnlyThumbnail && thumbnailUrl && (
        <div className="relative group overflow-hidden rounded-2xl border border-border bg-surface-2/40 shadow-xs max-w-xl">
          {/* biome-ignore lint/performance/noImgElement: user image upload */}
          <img
            src={thumbnailUrl}
            alt="İçerik görseli"
            className="w-full h-auto max-h-[480px] object-cover rounded-2xl transition-transform duration-200 group-hover:scale-[1.01]"
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => setSelectedImage(thumbnailUrl)}
            aria-label="Görseli büyüt"
            className="absolute top-3 right-3 p-2 rounded-xl bg-overlay/60 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-overlay/80 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachments Grid / Single Image */}
      {!hasOnlyThumbnail && imageAttachments.length > 0 && (
        <div
          className={`grid gap-3 ${
            imageAttachments.length === 1
              ? "grid-cols-1 max-w-xl"
              : imageAttachments.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
          }`}
        >
          {imageAttachments.map((att, index) => {
            const displayUrl = att.url || att.thumbnailUrl;
            const sizeLabel = formatBytes(att.byteSize);
            const dimensionLabel = att.width && att.height ? `${att.width}×${att.height}` : null;

            return (
              <div
                key={att.id || index}
                data-testid="attachment-item"
                className="group relative flex flex-col rounded-2xl border border-border bg-surface-2/40 overflow-hidden shadow-xs hover:border-border-strong transition-colors"
              >
                <div className="relative aspect-video sm:aspect-4/3 w-full overflow-hidden bg-surface-3/50 flex items-center justify-center">
                  {/* biome-ignore lint/performance/noImgElement: attachment preview */}
                  <img
                    src={att.thumbnailUrl || att.url}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-overlay/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedImage(displayUrl)}
                      aria-label="Görseli büyüt"
                      className="p-2 rounded-xl bg-card/90 text-foreground hover:bg-card transition-colors shadow-xs cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    {att.url && (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Orijinal görseli yeni sekmede aç"
                        className="p-2 rounded-xl bg-card/90 text-foreground hover:bg-card transition-colors shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Ek Detayları: Boyut ve Format */}
                {(sizeLabel || dimensionLabel || att.mimeType) && (
                  <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-muted-foreground border-t border-border/50 bg-surface-2/60">
                    <span className="font-mono">
                      {att.mimeType?.replace("image/", "") || "webp"}
                    </span>
                    <div className="flex items-center gap-2">
                      {dimensionLabel && <span>{dimensionLabel}</span>}
                      {sizeLabel && <span className="font-mono">{sizeLabel}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Modal */}
      <Dialog
        open={Boolean(selectedImage)}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="max-w-4xl p-2 border-border/80 bg-background/95 backdrop-blur-md overflow-hidden rounded-2xl">
          <div className="sr-only">
            <DialogTitle>Görsel Önizleme</DialogTitle>
          </div>
          <div className="relative flex flex-col items-center justify-center min-h-[300px]">
            {selectedImage && (
              // biome-ignore lint/performance/noImgElement: lightbox view
              <img
                src={selectedImage}
                alt="Büyütülmüş içerik görseli"
                className="max-h-[80vh] w-auto object-contain rounded-xl shadow-card"
              />
            )}
            <div className="flex items-center justify-between w-full px-2 pt-2 text-xs text-muted-foreground">
              {selectedImage && (
                <a
                  href={selectedImage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Orijinalini İndir / Aç</span>
                </a>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <X className="w-3.5 h-3.5 mr-1" />
                  Kapat
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
