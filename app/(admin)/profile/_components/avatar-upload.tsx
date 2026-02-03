"use client";

import { useState, useTransition, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Camera01Icon,
  Delete02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uploadTeamAvatar, removeTeamAvatar } from "@/actions/admin/profile";
import { toast } from "sonner";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  firstName: string;
  lastName: string;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
}

export function AvatarUpload({
  currentAvatarUrl,
  firstName,
  lastName,
}: AvatarUploadProps) {
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté (JPG, PNG, WebP uniquement)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 2 Mo)");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    startTransition(async () => {
      const formData = new FormData();
      formData.append("avatar", file);

      const result = await uploadTeamAvatar(formData);
      if (result.success) {
        toast.success("Photo mise à jour");
        setPreviewUrl(null);
      } else {
        toast.error(result.error ?? "Erreur lors de l'upload");
        setPreviewUrl(null);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeTeamAvatar();
      if (result.success) {
        toast.success("Photo supprimée");
        setPreviewUrl(null);
      } else {
        toast.error(result.error ?? "Erreur lors de la suppression");
      }
    });
  }

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="flex items-center gap-6">
      {/* Avatar preview */}
      <div className="relative">
        <Avatar className="h-24 w-24">
          {displayUrl && <AvatarImage src={displayUrl} alt="Avatar" />}
          <AvatarFallback className="text-2xl">
            {getInitials(firstName, lastName)}
          </AvatarFallback>
        </Avatar>
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={24}
              className="animate-spin text-white"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {/* Upload button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <HugeiconsIcon icon={Camera01Icon} size={16} />
            Changer
          </Button>

          {/* Remove button */}
          {currentAvatarUrl && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer la photo ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Votre photo de profil sera supprimée définitivement.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemove}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          JPG, PNG ou WebP. Max 2 Mo.
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
