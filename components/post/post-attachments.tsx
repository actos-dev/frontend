"use client";

import type { Attachment } from "actos";
import { ExternalLink, Maximize2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface PostAttachmentsProps {
  attachments?: Attachment[] | null;
  thumbnailUrl?: string | null;
  className?: string;
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
      aria-label="Gönderi görselleri"
      className={cn("pt-2 pb-2", className)}
    >
      {/* Standalone Thumbnail */}
      {hasOnlyThumbnail && thumbnailUrl && (
        <button
          type="button"
          onClick={() => setSelectedImage(thumbnailUrl)}
          className="group relative block w-full max-w-xl overflow-hidden rounded-lg border border-border bg-bg-subtle text-left"
          aria-label="Görseli büyüt"
        >
          {/* biome-ignore lint/performance/noImgElement: user image upload */}
          <img
            src={thumbnailUrl}
            alt="İçerik görseli"
            className="max-h-[520px] w-full object-cover"
            loading="lazy"
          />
          <span className="absolute right-3 top-3 rounded-md bg-overlay/70 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Maximize2 className="w-4 h-4" />
          </span>
        </button>
      )}

      {/* Attachments Grid / Single Image */}
      {!hasOnlyThumbnail && imageAttachments.length > 0 && (
        <div
          className={`grid gap-3 ${
            imageAttachments.length === 1 ? "grid-cols-1 max-w-xl" : "grid-cols-2"
          }`}
        >
          {imageAttachments.slice(0, 4).map((att, index) => {
            const displayUrl = att.url || att.thumbnailUrl;

            return (
              <button
                type="button"
                key={att.id || index}
                data-testid="attachment-item"
                onClick={() => setSelectedImage(displayUrl)}
                className={cn(
                  "group relative overflow-hidden border border-border bg-bg-subtle text-left",
                  imageAttachments.length === 1
                    ? "aspect-video rounded-lg"
                    : "aspect-square rounded-md",
                  imageAttachments.length === 3 && index === 0 ? "row-span-2 aspect-auto" : "",
                )}
                aria-label={`Görsel ${index + 1}'i büyüt`}
              >
                {/* biome-ignore lint/performance/noImgElement: attachment preview */}
                <img
                  src={att.thumbnailUrl || att.url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <span className="absolute inset-0 grid place-items-center bg-overlay/25 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Maximize2 className="h-5 w-5 text-white" />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox / Modal */}
      <Dialog
        open={Boolean(selectedImage)}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="max-w-5xl border-border bg-background p-3">
          <div className="sr-only">
            <DialogTitle>Görsel Önizleme</DialogTitle>
            <DialogDescription>Büyütülmüş içerik görseli önizlemesi</DialogDescription>
          </div>
          <div className="relative flex flex-col items-center justify-center min-h-[300px]">
            {selectedImage && (
              // biome-ignore lint/performance/noImgElement: lightbox view
              <img
                src={selectedImage}
                alt="Büyütülmüş içerik görseli"
                className="max-h-[82vh] w-auto object-contain"
              />
            )}
            <div className="flex items-center justify-between w-full px-2 pt-2 text-xs text-muted-foreground">
              {selectedImage ? (
                <a
                  href={selectedImage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Orijinali aç</span>
                </a>
              ) : null}
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
