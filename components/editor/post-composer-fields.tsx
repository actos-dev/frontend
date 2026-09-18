"use client";

import type { Attachment } from "actos";
import { Hash } from "lucide-react";
import { ImageUploader } from "@/components/editor/image-uploader";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { TagsInput } from "@/components/editor/tags-input";
import { PostAttachments } from "@/components/post/post-attachments";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";

export interface PostComposerFieldsProps {
  title: string;
  onTitleChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  tags: string[];
  onTagsChange?: (tags: string[]) => void;
  images?: File[];
  onImagesChange?: (files: File[]) => void;
  existingAttachments?: Attachment[];
  titleInputTestId?: string;
  disabled?: boolean;
}

export function PostComposerFields({
  title,
  onTitleChange,
  body,
  onBodyChange,
  tags,
  onTagsChange,
  images = [],
  onImagesChange,
  existingAttachments = [],
  titleInputTestId = "post-title-input",
  disabled = false,
}: PostComposerFieldsProps) {
  const { t } = useTranslation();
  const canEditTags = Boolean(onTagsChange);
  const canEditImages = Boolean(onImagesChange);

  return (
    <div className="space-y-6" data-testid="post-composer-fields">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">{t("editor.post_to")}</div>
        <div className="rounded-lg border border-border bg-surface-1 px-3.5 py-2.5 text-sm text-foreground">
          {t("editor.public_feed")}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="post-composer-title"
          className="block text-sm font-semibold text-foreground"
        >
          {t("editor.title_label")}
        </label>
        <Input
          id="post-composer-title"
          data-testid={titleInputTestId}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={t("editor.title_placeholder")}
          disabled={disabled}
          maxLength={300}
          className="h-auto bg-card px-3.5 py-2.5 text-lg font-medium"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">{t("editor.body_label")}</div>
        <MarkdownEditor
          value={body}
          onChange={onBodyChange}
          placeholder={t("editor.body_placeholder")}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">{t("editor.upload_image")}</div>
        {canEditImages && onImagesChange ? (
          <ImageUploader files={images} onFilesChange={onImagesChange} disabled={disabled} />
        ) : existingAttachments.length > 0 ? (
          <div className="rounded-lg border border-border bg-surface-1 p-3">
            <PostAttachments attachments={existingAttachments} className="p-0" />
            <p className="mt-2 text-xs text-muted-foreground">{t("editor.images_read_only")}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("editor.no_existing_images")}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">{t("editor.tags_label")}</div>
        {canEditTags && onTagsChange ? (
          <TagsInput value={tags} onChange={onTagsChange} maxTags={5} disabled={disabled} />
        ) : (
          <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 py-2">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 font-mono text-xs">
                  <Hash className="h-3 w-3" />
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">{t("editor.no_tags")}</span>
            )}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {canEditTags ? t("editor.tags_hint") : t("editor.tags_read_only")}
        </p>
      </div>
    </div>
  );
}
