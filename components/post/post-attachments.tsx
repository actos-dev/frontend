"use client";

import type { Attachment } from "actos";
import { ExternalLink, Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface PostAttachmentsProps {
  attachments?: Attachment[] | null;
  thumbnailUrl?: string | null;
  className?: string;
}

export function PostAttachments({ attachments, thumbnailUrl, className }: PostAttachmentsProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { t } = useTranslation();

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
      aria-label={t("postAttachments.label")}
      className={cn("pt-2 pb-2", className)}
    >
      {/* Standalone Thumbnail */}
      {hasOnlyThumbnail && thumbnailUrl && (
        <button
          type="button"
          onClick={() => setSelectedImage(thumbnailUrl)}
          className="group relative block w-full max-w-xl overflow-hidden rounded-lg border border-border bg-bg-subtle text-left"
          aria-label={t("postAttachments.enlarge")}
        >
          <Image
            src={thumbnailUrl}
            alt={t("postAttachments.content_image")}
            width={1200}
            height={675}
            className="h-auto max-h-[520px] w-full object-cover"
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
                aria-label={t("postAttachments.enlarge_numbered", { number: index + 1 })}
              >
                <Image
                  src={att.thumbnailUrl || att.url}
                  alt=""
                  fill
                  sizes={imageAttachments.length === 1 ? "(max-width: 640px) 100vw, 576px" : "50vw"}
                  className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
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
            <DialogTitle>{t("postAttachments.preview_title")}</DialogTitle>
            <DialogDescription>{t("postAttachments.preview_description")}</DialogDescription>
          </div>
          <div className="relative flex flex-col items-center justify-center min-h-[300px]">
            {selectedImage && (
              <Image
                src={selectedImage}
                alt={t("postAttachments.enlarged_alt")}
                width={1600}
                height={1200}
                className="h-auto max-h-[82vh] w-auto object-contain"
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
                  <span>{t("postAttachments.open_original")}</span>
                </a>
              ) : null}
              <DialogClose asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <X className="w-3.5 h-3.5 mr-1" />
                  {t("common.close")}
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
