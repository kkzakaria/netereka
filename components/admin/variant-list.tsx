"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatPrice } from "@/lib/utils";
import type { ProductVariant } from "@/lib/db/types";
import { deleteVariant } from "@/actions/admin/variants";
import { VariantForm } from "./variant-form";

export function VariantList({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariant[];
}) {
  const [editVariant, setEditVariant] = useState<ProductVariant | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(variantId: string) {
    startTransition(async () => {
      const result = await deleteVariant(variantId, productId);
      if (result.success) {
        toast.success("Variante supprimée");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Variantes ({variants.length})</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          Ajouter
        </Button>
      </div>

      {variants.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => (
                <TableRow key={v.id} data-pending={isPending || undefined}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {v.sku || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatPrice(v.price)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={v.stock_quantity <= 5 ? "destructive" : "secondary"}
                    >
                      {v.stock_quantity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.is_active ? "default" : "secondary"}>
                      {v.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditVariant(v)}
                      >
                        Modifier
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-destructive"
                          >
                            Suppr.
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Supprimer cette variante ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              La variante &quot;{v.name}&quot; sera supprimée
                              définitivement.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(v.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          Aucune variante
        </div>
      )}

      <VariantForm
        productId={productId}
        open={showCreate}
        onOpenChange={setShowCreate}
      />
      <VariantForm
        productId={productId}
        variant={editVariant}
        open={!!editVariant}
        onOpenChange={(open) => {
          if (!open) setEditVariant(null);
        }}
      />
    </div>
  );
}
