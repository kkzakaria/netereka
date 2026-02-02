"use client";

import { useTransition, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useCartStore, useCartSubtotal } from "@/stores/cart-store";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/checkout";
import { createOrder, validatePromoCode } from "@/actions/checkout";
import { formatPrice } from "@/lib/utils/format";
import { getImageUrl } from "@/lib/utils/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DeliveryZone, Address } from "@/lib/db/types";

interface CheckoutFormProps {
  zones: DeliveryZone[];
  savedAddresses: Address[];
  userName: string;
  userPhone?: string;
}

export function CheckoutForm({
  zones,
  savedAddresses,
  userName,
  userPhone,
}: CheckoutFormProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartSubtotal();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Promo state
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<{
    valid: boolean;
    discount: number;
    label: string | null;
    error: string | null;
  } | null>(null);
  const [promoLoading, startPromoTransition] = useTransition();

  // Address mode
  const [addressMode, setAddressMode] = useState<"saved" | "new">(
    savedAddresses.length > 0 ? "saved" : "new"
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    savedAddresses.find((a) => a.is_default)?.id ?? savedAddresses[0]?.id ?? ""
  );

  const selectedSavedAddress =
    addressMode === "saved"
      ? savedAddresses.find((a) => a.id === selectedAddressId)
      : null;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      savedAddressId: selectedAddressId || undefined,
      fullName: userName || "",
      phone: userPhone || "",
      street: "",
      commune: selectedSavedAddress?.commune ?? "",
      instructions: "",
      saveAddress: false,
      addressLabel: "",
      promoCode: "",
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    },
  });

  const commune = useWatch({ control, name: "commune" });
  const saveAddress = useWatch({ control, name: "saveAddress" });
  const selectedZone = zones.find((z) => z.commune === commune);
  const deliveryFee = selectedZone?.fee ?? 0;
  const discount = promoResult?.valid ? promoResult.discount : 0;
  const total = subtotal + deliveryFee - discount;

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router]);

  // Sync items to form
  useEffect(() => {
    setValue(
      "items",
      items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      { shouldDirty: false }
    );
  }, [items, setValue]);

  // Sync address mode
  useEffect(() => {
    if (addressMode === "saved" && selectedAddressId) {
      setValue("savedAddressId", selectedAddressId);
      const addr = savedAddresses.find((a) => a.id === selectedAddressId);
      if (addr) setValue("commune", addr.commune);
    } else {
      setValue("savedAddressId", undefined);
    }
  }, [addressMode, selectedAddressId, savedAddresses, setValue]);

  const handlePromoApply = useCallback(() => {
    if (!promoInput.trim()) return;
    startPromoTransition(async () => {
      const result = await validatePromoCode(promoInput.trim(), subtotal);
      setPromoResult(result);
      if (result.valid) {
        setValue("promoCode", promoInput.trim().toUpperCase());
      } else {
        setValue("promoCode", "");
      }
    });
  }, [promoInput, subtotal, setValue]);

  function onSubmit(data: CheckoutInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await createOrder(data);
      if (result.success && result.orderNumber) {
        router.push(`/checkout/success?order=${result.orderNumber}`);
      } else {
        setServerError(result.error ?? "Une erreur est survenue");
      }
    });
  }

  if (items.length === 0) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ---- Address Section ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Adresse de livraison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {savedAddresses.length > 0 && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setAddressMode("saved")}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    addressMode === "saved"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Adresse enregistree
                </button>
                <button
                  type="button"
                  onClick={() => setAddressMode("new")}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    addressMode === "new"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Nouvelle adresse
                </button>
              </div>

              {addressMode === "saved" && (
                <div className="space-y-2">
                  {savedAddresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selectedAddressId === addr.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedAddr"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <p className="font-medium">
                          {addr.label}
                          {addr.is_default === 1 && (
                            <Badge variant="secondary" className="ml-2">
                              Par defaut
                            </Badge>
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          {addr.full_name} &middot; {addr.phone}
                        </p>
                        <p className="text-muted-foreground">
                          {addr.street}, {addr.commune}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {addressMode === "new" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    {...register("fullName")}
                    placeholder="Nom et prenom"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Telephone</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="+225 07 00 00 00"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="street">Adresse / Rue</Label>
                <Input
                  id="street"
                  {...register("street")}
                  placeholder="Quartier, rue, repere"
                />
                {errors.street && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.street.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Commune select - always visible */}
          {addressMode === "new" && (
            <div>
              <Label htmlFor="commune">Commune</Label>
              <select
                id="commune"
                {...register("commune")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selectionnez une commune</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.commune}>
                    {z.name} — {formatPrice(z.fee)}
                  </option>
                ))}
              </select>
              {errors.commune && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.commune.message}
                </p>
              )}
            </div>
          )}

          {/* Instructions */}
          <div>
            <Label htmlFor="instructions">Instructions de livraison (optionnel)</Label>
            <Textarea
              id="instructions"
              {...register("instructions")}
              placeholder="Indications supplementaires pour le livreur"
              rows={2}
            />
          </div>

          {/* Save address */}
          {addressMode === "new" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("saveAddress")} />
                Enregistrer cette adresse
              </label>
              {saveAddress && (
                <div>
                  <Label htmlFor="addressLabel">Nom de l&apos;adresse</Label>
                  <Input
                    id="addressLabel"
                    {...register("addressLabel")}
                    placeholder="ex: Domicile, Bureau"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Order Summary ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Recapitulatif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}:${item.variantId ?? "default"}`}
              className="flex items-center gap-3"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                <Image
                  src={getImageUrl(item.imageUrl)}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium leading-tight">{item.name}</p>
                {item.variantName && (
                  <p className="text-muted-foreground">{item.variantName}</p>
                )}
                <p className="text-muted-foreground">Qte: {item.quantity}</p>
              </div>
              <p className="text-sm font-medium">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ---- Promo Code ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Code promo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Entrez votre code"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handlePromoApply}
              disabled={promoLoading}
            >
              {promoLoading ? "..." : "Appliquer"}
            </Button>
          </div>
          {promoResult && (
            <p
              className={`mt-2 text-sm ${
                promoResult.valid ? "text-green-600" : "text-destructive"
              }`}
            >
              {promoResult.valid
                ? `Code applique : ${promoResult.label}`
                : promoResult.error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ---- Payment ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
              💵
            </div>
            <div>
              <p className="font-medium">Paiement a la livraison</p>
              <p className="text-sm text-muted-foreground">
                Payez en especes a la reception de votre commande
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Totals ---- */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Livraison</span>
              <span>
                {selectedZone ? formatPrice(deliveryFee) : "—"}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Reduction {promoResult?.label}</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Server Error ---- */}
      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* ---- Submit ---- */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background px-4 py-4 sm:static sm:mx-0 sm:border-0 sm:p-0">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isPending || !selectedZone}
        >
          {isPending ? "Traitement en cours..." : `Confirmer la commande — ${formatPrice(total)}`}
        </Button>
      </div>
    </form>
  );
}
