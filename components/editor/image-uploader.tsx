"use client";

import { AlertCircle, ImageIcon, Loader2, UploadCloud } from "lucide-react";
import * as React from "react";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const STORAGE_QUOTA_USER_MESSAGE =
  "Depolama kotanız doldu veya dosya sınırı aşıldı. Güven kademeniz yükseldikçe yükleme kotanız ve limitleriniz otomatik olarak artacaktır.";

export const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ImageUploaderProps {
  onImageUploaded: (markdownSnippet: string, url: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ImageUploader({
  onImageUploaded,
  disabled = false,
  className,
}: ImageUploaderProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (disabled || isUploading) return;

    // Validate type and size client-side
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(STORAGE_QUOTA_USER_MESSAGE);
      toast.error(STORAGE_QUOTA_USER_MESSAGE);
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // Plan §Faz 10: Never show raw technical error string on quota or media rejection
        setErrorMessage(STORAGE_QUOTA_USER_MESSAGE);
        toast.error(STORAGE_QUOTA_USER_MESSAGE);
        return;
      }

      const json = await res.json();
      if (json.ok && json.data?.url) {
        const altText = file.name.replace(/\.[^.]+$/, "") || "görsel";
        const snippet = `![${altText}](${json.data.url})\n`;
        onImageUploaded(snippet, json.data.url);
        toast.success("Görsel başarıyla yüklendi.");
      } else {
        setErrorMessage(STORAGE_QUOTA_USER_MESSAGE);
        toast.error(STORAGE_QUOTA_USER_MESSAGE);
      }
    } catch {
      setErrorMessage(STORAGE_QUOTA_USER_MESSAGE);
      toast.error(STORAGE_QUOTA_USER_MESSAGE);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
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
    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  return (
    <div data-testid="image-uploader" className={cn("w-full space-y-2", className)}>
      {/* Drag and Drop Zone */}
      <button
        type="button"
        data-testid="image-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        disabled={disabled || isUploading}
        className={cn(
          "w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors bg-surface-1/50 border-border hover:bg-surface-2 hover:border-primary/50",
          isDragging && "border-primary bg-primary/5 scale-[1.005]",
          (disabled || isUploading) && "opacity-60 cursor-not-allowed",
        )}
      >
        <input
          ref={fileInputRef}
          data-testid="image-file-input"
          type="file"
          accept={SUPPORTED_IMAGE_TYPES.join(",")}
          onChange={handleFileInputChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {isUploading ? (
          <div
            data-testid="uploading-spinner"
            className="flex items-center gap-2 text-sm text-primary py-2 font-medium"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t("editor.uploading")}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-1 text-muted-foreground">
            <div className="p-2 rounded-full bg-surface-2 text-foreground">
              {isDragging ? (
                <UploadCloud className="w-5 h-5 text-primary animate-bounce" />
              ) : (
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-foreground font-medium">
              {isDragging ? t("editor.upload_drop_active") : t("editor.upload_drag_drop")}
            </p>
            <p data-testid="upload-quota-note" className="text-[11px] text-muted-foreground">
              {t("editor.storage_quota_formats")}
            </p>
          </div>
        )}
      </button>

      {/* Storage Quota / File Rejection User-Friendly Message */}
      {errorMessage && (
        <div
          data-testid="upload-quota-error"
          role="alert"
          className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Yükleme Sınırı</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
