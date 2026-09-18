"use client";

import { AlertCircle, ArrowLeft, ArrowRight, ImageIcon, UploadCloud, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function getImageLimitUserMessage(contentLabel = "gönderi"): string {
  return `Desteklenmeyen dosya biçimi veya boyut sınırı aşıldı. Görsel başına en fazla 8 MiB, ${contentLabel} başına en fazla 4 görsel ekleyebilirsiniz.`;
}

export const IMAGE_LIMIT_USER_MESSAGE = getImageLimitUserMessage();

export const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Matches the backend's default MAX_UPLOAD_BYTES (8 MiB per image).
export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export const MAX_ATTACHMENTS = 4;

export interface ImageUploaderProps {
  /** Images staged to be sent alongside the post/comment on submit. */
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  contentLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Stages up to `maxFiles` images locally for attachment to a post or comment.
 * There is no standalone upload step any more — the selected files are only
 * sent to the server as part of the `posts.create()` / `comments.create()`
 * multipart request, via the `files` option.
 */
export function ImageUploader({
  files,
  onFilesChange,
  maxFiles = MAX_ATTACHMENTS,
  contentLabel = "gönderi",
  disabled = false,
  className,
}: ImageUploaderProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const previews = React.useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  React.useEffect(() => {
    return () => {
      for (const { url } of previews) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previews]);

  const addFiles = (incoming: FileList | File[]) => {
    if (disabled) return;

    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      setErrorMessage(t("editor.image_limit_error", { content: contentLabel }));
      return;
    }

    const accepted: File[] = [];
    let rejectedAny = false;
    for (const file of Array.from(incoming)) {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE_BYTES) {
        rejectedAny = true;
        continue;
      }
      if (accepted.length >= remainingSlots) {
        rejectedAny = true;
        break;
      }
      accepted.push(file);
    }

    if (accepted.length > 0) {
      onFilesChange([...files, ...accepted]);
    }
    setErrorMessage(rejectedAny ? t("editor.image_limit_error", { content: contentLabel }) : null);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= files.length || disabled) return;
    const reordered = [...files];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    onFilesChange(reordered);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const dropped = e.dataTransfer.files;
    if (dropped && dropped.length > 0) {
      addFiles(dropped);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      addFiles(selected);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const atLimit = files.length >= maxFiles;

  return (
    <div data-testid="image-uploader" className={cn("w-full space-y-2", className)}>
      {/* Staged Image Previews */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map(({ file, url }, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${file.size}`}
              data-testid={`staged-image-${index}`}
              className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-surface-2 shrink-0"
            >
              <Image
                src={url}
                alt={file.name}
                width={80}
                height={80}
                unoptimized
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                data-testid={`remove-staged-image-${index}`}
                onClick={() => removeFile(index)}
                disabled={disabled}
                aria-label={t("editor.image_remove", { name: file.name })}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
              {files.length > 1 && (
                <div className="absolute bottom-0.5 left-0.5 flex gap-0.5">
                  <button
                    type="button"
                    data-testid={`move-staged-image-left-${index}`}
                    onClick={() => moveFile(index, -1)}
                    disabled={disabled || index === 0}
                    aria-label={t("editor.image_move_left", { name: file.name })}
                    className="rounded-full bg-background/85 p-0.5 text-foreground disabled:opacity-35"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    data-testid={`move-staged-image-right-${index}`}
                    onClick={() => moveFile(index, 1)}
                    disabled={disabled || index === files.length - 1}
                    aria-label={t("editor.image_move_right", { name: file.name })}
                    className="rounded-full bg-background/85 p-0.5 text-foreground disabled:opacity-35"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drag and Drop Zone */}
      {!atLimit && (
        <button
          type="button"
          data-testid="image-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled) {
              fileInputRef.current?.click();
            }
          }}
          disabled={disabled}
          className={cn(
            "w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors bg-surface-1/50 border-border hover:bg-surface-2 hover:border-primary/50",
            isDragging && "border-primary bg-primary/5 scale-[1.005]",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          <input
            ref={fileInputRef}
            data-testid="image-file-input"
            type="file"
            accept={SUPPORTED_IMAGE_TYPES.join(",")}
            multiple
            onChange={handleFileInputChange}
            disabled={disabled}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-1.5 py-1 text-muted-foreground">
            <div className="p-2 rounded-full bg-surface-2 text-foreground">
              {isDragging ? (
                <UploadCloud className="w-5 h-5 text-primary animate-bounce" />
              ) : (
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-foreground font-medium">
              {isDragging ? t("editor.image_drop_active") : t("editor.image_drop_idle")}
            </p>
            <p data-testid="upload-quota-note" className="text-[11px] text-muted-foreground">
              {t("editor.image_quota", { content: contentLabel, count: maxFiles })}
            </p>
          </div>
        </button>
      )}

      {/* File Rejection / Limit Message */}
      {errorMessage && (
        <div
          data-testid="upload-quota-error"
          role="alert"
          className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">{t("editor.image_limit_title")}</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
