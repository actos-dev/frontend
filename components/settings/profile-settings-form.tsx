"use client";

import type { Actor } from "actos";
import { AlertTriangle, Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar, AvatarActorBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ActorType } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n";
import { useSessionStore } from "@/lib/stores/session-store";

export interface ProfileSettingsFormProps {
  initialActor: Actor;
  section?: "all" | "profile" | "account";
}

/**
 * Profile & Avatar settings form with account deletion (Plan §Faz 11).
 *
 * The avatar is managed through its own endpoints (`POST`/`DELETE
 * /api/actors/me/avatar`) and takes effect immediately, independent of the
 * displayName/bio form below. Profile update itself only ever sends
 * `displayName` and `bio`.
 */
export function ProfileSettingsForm({ initialActor, section = "all" }: ProfileSettingsFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(initialActor.displayName || "");
  const [bio, setBio] = useState(initialActor.bio || "");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialActor.avatarUrl || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Danger zone deletion modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("settings.profile.invalid_image"));
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/actors/me/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || t("settings.profile.avatar_upload_error"));
        return;
      }

      const newAvatarUrl = data.data.avatarUrl as string;
      setAvatarPreview(newAvatarUrl);

      const currentUser = useSessionStore.getState().user;
      if (currentUser) {
        useSessionStore.getState().setUser({ ...currentUser, avatarUrl: newAvatarUrl });
      }

      toast.success(t("settings.profile.avatar_updated"));
    } catch {
      toast.error(t("settings.profile.avatar_upload_network_error"));
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (isRemovingAvatar) return;
    setIsRemovingAvatar(true);

    try {
      const res = await fetch("/api/actors/me/avatar", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || t("settings.profile.avatar_remove_error"));
        return;
      }

      setAvatarPreview(null);

      const currentUser = useSessionStore.getState().user;
      if (currentUser) {
        useSessionStore.getState().setUser({ ...currentUser, avatarUrl: null });
      }

      toast.success(t("settings.profile.avatar_removed"));
    } catch {
      toast.error(t("settings.profile.avatar_remove_network_error"));
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);

    try {
      const payload: {
        displayName?: string | null;
        bio?: string | null;
      } = {
        displayName: displayName.trim() ? displayName.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
      };

      const res = await fetch("/api/actors/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || t("settings.profile.save_error"));
        return;
      }

      const updatedActor = data.actor as Actor;

      // Oturum deposunu güncelle
      const currentUser = useSessionStore.getState().user;
      if (currentUser) {
        useSessionStore.getState().setUser({
          ...currentUser,
          displayName: updatedActor.displayName,
        });
      }

      toast.success(t("settings.profile.success"));
    } catch {
      toast.error(t("settings.profile.save_network_error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmUsername.trim() !== initialActor.username || isDeleting) return;

    setIsDeleting(true);

    try {
      const res = await fetch("/api/actors/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recoveryCode: recoveryCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.detail || data.title || t("settings.danger_zone.modal.error"));
        return;
      }

      await useSessionStore.getState().logout();
      toast.success(t("settings.danger_zone.modal.success"));
      setDeleteModalOpen(false);
      router.push("/");
    } catch {
      toast.error(t("settings.danger_zone.modal.network_error"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Profil Düzenleme Formu */}
      {section !== "account" && (
        <form onSubmit={handleSubmit} className="space-y-8" data-testid="profile-form">
          {/* Avatar Bölümü */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t("settings.profile.avatar")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.profile.avatar_desc")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative shrink-0">
                <Avatar className="h-20 w-20 border-2 border-border shadow-xs">
                  <AvatarImage
                    src={avatarPreview || undefined}
                    alt={displayName || initialActor.username}
                  />
                  <AvatarFallback className="text-lg font-bold">
                    {(displayName || initialActor.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <AvatarActorBadge
                  actorType={(initialActor.actorType || "human") as ActorType}
                  size="lg"
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploadingAvatar || isRemovingAvatar}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar || isRemovingAvatar}
                    className="cursor-pointer gap-2"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <span>
                      {isUploadingAvatar
                        ? t("settings.profile.avatar_uploading")
                        : t("settings.profile.avatar_upload")}
                    </span>
                  </Button>

                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar || isRemovingAvatar}
                      className="text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5"
                    >
                      {isRemovingAvatar ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      <span>{t("settings.profile.avatar_remove")}</span>
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("settings.profile.avatar_formats")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Temel Bilgiler Formu */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {t("settings.profile.title")}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.profile.details_desc")}
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              {/* Kullanıcı Adı (Salt Okunur) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="username-display"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  {t("settings.profile.username_readonly")}
                </label>
                <Input
                  id="username-display"
                  value={`@${initialActor.username}`}
                  disabled
                  className="bg-surface-2/60 font-mono text-muted-foreground cursor-not-allowed"
                />
              </div>

              {/* Görünen Ad */}
              <div className="space-y-1.5">
                <label htmlFor="display-name" className="text-xs font-semibold text-foreground">
                  {t("settings.profile.display_name")}
                </label>
                <Input
                  id="display-name"
                  data-testid="display-name-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={64}
                  placeholder={t("settings.profile.display_name_placeholder")}
                />
                <span className="text-[11px] text-muted-foreground block text-right">
                  {displayName.length}/64
                </span>
              </div>

              {/* Biyografi */}
              <div className="space-y-1.5">
                <label htmlFor="bio" className="text-xs font-semibold text-foreground">
                  {t("settings.profile.bio")}
                </label>
                <Textarea
                  id="bio"
                  data-testid="bio-input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder={t("settings.profile.bio_placeholder")}
                />
                <span className="text-[11px] text-muted-foreground block text-right">
                  {bio.length}/500
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                data-testid="save-profile-button"
                className="cursor-pointer gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />}
                <span>{isSaving ? t("settings.profile.saving") : t("settings.profile.save")}</span>
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Tehlikeli Bölge (Danger Zone) — Hesap Silme */}
      {section !== "profile" && (
        <>
          <div
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-xs space-y-4"
            data-testid="danger-zone"
          >
            <div className="flex items-center gap-2.5 text-destructive">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-base font-bold tracking-tight">
                {t("settings.danger_zone.title")}
              </h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {t("settings.danger_zone.desc")}
            </p>

            <div className="pt-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteModalOpen(true)}
                data-testid="delete-account-button"
                className="cursor-pointer gap-2 shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t("settings.danger_zone.delete_button")}</span>
              </Button>
            </div>
          </div>

          {/* Hesap Silme Onay Modalı */}
          <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <AlertTriangle className="w-5 h-5" />
                  <DialogTitle>{t("settings.danger_zone.modal.title")}</DialogTitle>
                </div>
                <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
                  {t("settings.danger_zone.modal.warning")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="space-y-2">
                  <label
                    htmlFor="delete-confirm-username"
                    className="text-xs font-semibold text-foreground"
                  >
                    {t("settings.danger_zone.modal.confirm_instruction", {
                      username: initialActor.username,
                    })}
                  </label>
                  <Input
                    id="delete-confirm-username"
                    data-testid="delete-username-input"
                    value={confirmUsername}
                    onChange={(e) => setConfirmUsername(e.target.value)}
                    placeholder={initialActor.username}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="delete-recovery-code"
                    className="text-xs font-semibold text-foreground"
                  >
                    {t("settings.danger_zone.modal.recovery_code_label")}
                  </label>
                  <Input
                    id="delete-recovery-code"
                    data-testid="delete-recovery-input"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder={t("settings.danger_zone.modal.recovery_code_placeholder")}
                    className="font-mono text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {t("settings.danger_zone.modal.recovery_code_hint")}
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={isDeleting}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={confirmUsername.trim() !== initialActor.username || isDeleting}
                  data-testid="confirm-delete-button"
                  className="cursor-pointer gap-2"
                >
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  <span>
                    {isDeleting
                      ? t("settings.danger_zone.modal.deleting")
                      : t("settings.danger_zone.modal.submit_delete")}
                  </span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
