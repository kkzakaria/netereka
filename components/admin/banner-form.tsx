"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Banner } from "@/lib/db/types";
import { getImageUrl } from "@/lib/utils/images";
import {
  createBanner,
  updateBanner,
  uploadBannerImage,
} from "@/actions/admin/banners";
import dynamic from "next/dynamic";
import { AiGenerateButton } from "./ai-generate-button";
import { generateBannerText } from "@/actions/admin/ai";

const AiImageDialog = dynamic(() => import("./ai-image-dialog").then((m) => m.AiImageDialog));
import type { BannerTextResult } from "@/lib/ai/schemas";

interface BannerFormProps {
  banner?: Banner | null;
}

export function BannerForm({ banner }: BannerFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!banner;
  const isActiveRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const subtitleRef = useRef<HTMLTextAreaElement>(null);
  const ctaTextRef = useRef<HTMLInputElement>(null);
  const badgeTextRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    banner?.image_url ?? null
  );

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateBanner(banner!.id, formData)
          : await createBanner(formData);

        if (result.success) {
          toast.success(isEdit ? "Bannière mise à jour" : "Bannière créée");
          if (!isEdit && result.id) {
            router.push(`/banners/${result.id}/edit`);
          }
        } else {
          toast.error(result.error || "Une erreur est survenue");
        }
      } catch {
        toast.error("Erreur de connexion au serveur. Veuillez réessayer.");
      }
    });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadBannerImage(banner!.id, formData);

        if (result.success) {
          toast.success("Image mise à jour");
          setImagePreview(result.url ?? null);
        } else {
          toast.error(result.error || "Une erreur est survenue");
        }
      } catch {
        toast.error("Erreur de connexion au serveur. Veuillez réessayer.");
      }
    });
  }

  return (
    <form action={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Informations */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Informations</CardTitle>
              <AiGenerateButton<BannerTextResult>
                label="Générer les textes"
                onGenerate={() => generateBannerText({})}
                onResult={(data) => {
                  if (titleRef.current) titleRef.current.value = data.title;
                  if (subtitleRef.current) subtitleRef.current.value = data.subtitle;
                  if (ctaTextRef.current) ctaTextRef.current.value = data.ctaText;
                  if (badgeTextRef.current) badgeTextRef.current.value = data.badgeText ?? "";
                }}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  name="title"
                  ref={titleRef}
                  required
                  defaultValue={banner?.title ?? ""}
                  placeholder="Ex: PlayStation 5 - Offre spéciale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Sous-titre</Label>
                <Textarea
                  id="subtitle"
                  name="subtitle"
                  ref={subtitleRef}
                  rows={2}
                  defaultValue={banner?.subtitle ?? ""}
                  placeholder="Description courte de la bannière"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="link_url">Lien (URL)</Label>
                  <Input
                    id="link_url"
                    name="link_url"
                    required
                    defaultValue={banner?.link_url ?? ""}
                    placeholder="Ex: /p/playstation-5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta_text">Texte du bouton</Label>
                  <Input
                    id="cta_text"
                    name="cta_text"
                    ref={ctaTextRef}
                    defaultValue={banner?.cta_text ?? "Découvrir"}
                    placeholder="Découvrir"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Apparence */}
          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="badge_text">Texte du badge</Label>
                  <Input
                    id="badge_text"
                    name="badge_text"
                    ref={badgeTextRef}
                    defaultValue={banner?.badge_text ?? ""}
                    placeholder="Ex: Nouveau, Promo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_color">Couleur du badge</Label>
                  <Select
                    name="badge_color"
                    defaultValue={banner?.badge_color ?? "mint"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mint">Vert menthe</SelectItem>
                      <SelectItem value="red">Rouge</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                      <SelectItem value="blue">Bleu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bg_gradient_from">Dégradé - Début</Label>
                  <input
                    type="color"
                    id="bg_gradient_from"
                    name="bg_gradient_from"
                    defaultValue={banner?.bg_gradient_from ?? "#183C78"}
                    className="h-10 w-full cursor-pointer rounded-md border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bg_gradient_to">Dégradé - Fin</Label>
                  <input
                    type="color"
                    id="bg_gradient_to"
                    name="bg_gradient_to"
                    defaultValue={banner?.bg_gradient_to ?? "#1E4A8F"}
                    className="h-10 w-full cursor-pointer rounded-md border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Prix (FCFA)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  defaultValue={banner?.price ?? ""}
                  placeholder="Optionnel"
                />
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle>Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEdit ? (
                <>
                  {imagePreview && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border">
                      <Image
                        src={getImageUrl(imagePreview)}
                        alt={banner?.title ?? "Banner"}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? "Changer l'image" : "Ajouter une image"}
                    </Button>
                    <AiImageDialog
                      onImageGenerated={(url) => {
                        setImagePreview(url);
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Enregistrez d&apos;abord la bannière pour ajouter une image.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Programmation */}
          <Card>
            <CardHeader>
              <CardTitle>Programmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Date de début</Label>
                  <input
                    type="datetime-local"
                    id="starts_at"
                    name="starts_at"
                    defaultValue={banner?.starts_at?.replace(" ", "T").slice(0, 16) ?? ""}
                    className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ends_at">Date de fin</Label>
                  <input
                    type="datetime-local"
                    id="ends_at"
                    name="ends_at"
                    defaultValue={banner?.ends_at?.replace(" ", "T").slice(0, 16) ?? ""}
                    className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <input
                  type="hidden"
                  name="is_active"
                  ref={isActiveRef}
                  defaultValue={banner?.is_active ?? 1}
                />
                <Switch
                  defaultChecked={banner ? banner.is_active === 1 : true}
                  onCheckedChange={(checked) => {
                    if (isActiveRef.current)
                      isActiveRef.current.value = checked ? "1" : "0";
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Ordre d&apos;affichage</Label>
                <Input
                  id="display_order"
                  name="display_order"
                  type="number"
                  min={0}
                  defaultValue={banner?.display_order ?? 0}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? "Enregistrement..."
              : isEdit
                ? "Mettre à jour"
                : "Créer la bannière"}
          </Button>
        </div>
      </div>
    </form>
  );
}
