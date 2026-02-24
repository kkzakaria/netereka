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
import type { BadgeColor, Banner, BannerGradient } from "@/lib/db/types";
import { getImageUrl } from "@/lib/utils/images";
import {
  createBanner,
  updateBanner,
  uploadBannerImage,
} from "@/actions/admin/banners";
import { GradientPicker } from "./gradient-picker";
import { BannerPreview } from "./banner-preview";

interface BannerFormProps {
  banner?: Banner | null;
  savedGradients?: BannerGradient[];
}

export function BannerForm({ banner, savedGradients: initialGradients = [] }: BannerFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!banner;
  const isActiveRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controlled visual state (feeds the live preview)
  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [ctaText, setCtaText] = useState(banner?.cta_text ?? "Découvrir");
  const [badgeText, setBadgeText] = useState(banner?.badge_text ?? "");
  const [badgeColor, setBadgeColor] = useState<BadgeColor>(banner?.badge_color ?? "mint");
  const [bgFrom, setBgFrom] = useState(banner?.bg_gradient_from ?? "#183C78");
  const [bgTo, setBgTo] = useState(banner?.bg_gradient_to ?? "#1E4A8F");
  const [price, setPrice] = useState<string>(banner?.price != null ? String(banner.price) : "");
  const [imagePreview, setImagePreview] = useState<string | null>(banner?.image_url ?? null);

  // Saved gradients with optimistic updates
  const [savedGradients, setSavedGradients] = useState<BannerGradient[]>(initialGradients);

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
      {/* Full-width sticky preview */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <BannerPreview
          title={title}
          subtitle={subtitle}
          badgeText={badgeText}
          badgeColor={badgeColor}
          price={price !== "" ? Number(price) : null}
          imageUrl={imagePreview}
          bgFrom={bgFrom}
          bgTo={bgTo}
          ctaText={ctaText}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Informations */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: PlayStation 5 - Offre spéciale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Sous-titre</Label>
                <Textarea
                  id="subtitle"
                  name="subtitle"
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
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
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
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
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="Ex: Nouveau, Promo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_color">Couleur du badge</Label>
                  <Select
                    name="badge_color"
                    value={badgeColor}
                    onValueChange={(v) => setBadgeColor(v as BadgeColor)}
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

              <GradientPicker
                colorFrom={bgFrom}
                colorTo={bgTo}
                savedGradients={savedGradients}
                onChange={(from, to) => {
                  setBgFrom(from);
                  setBgTo(to);
                }}
                onGradientSaved={(g) => setSavedGradients((prev) => [...prev, g])}
                onGradientDeleted={(id) =>
                  setSavedGradients((prev) => prev.filter((g) => g.id !== id))
                }
              />

              <div className="space-y-2">
                <Label htmlFor="price">Prix (FCFA)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
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
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreview ? "Changer l'image" : "Ajouter une image"}
                  </Button>
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
