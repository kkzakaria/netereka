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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { formatPrice } from "@/lib/utils";
import type { ProductVariant } from "@/lib/db/types";
import { deleteVariant } from "@/actions/admin/variants";
import { VariantForm } from "./variant-form";
import { VariantCardMobile } from "./variant-card-mobile";
import { useViewMode } from "./view-context";

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
  const { effectiveMode } = useViewMode();

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
        <Button size="touch" onClick={() => setShowCreate(true)}>
          Ajouter
        </Button>
      </div>

      {variants.length > 0 ? (
        effectiveMode === "cards" ? (
          // Mobile card view
          <div className="flex flex-col gap-3">
            {variants.map((v) => (
              <VariantCardMobile
                key={v.id}
                variant={v}
                onEdit={setEditVariant}
                onDelete={handleDelete}
                isPending={isPending}
              />
            ))}
          </div>
        ) : (
          // Desktop table view
          <div className="rounded-lg border touch-manipulation">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((v) => (
                  <TableRow key={v.id} data-pending={isPending || undefined}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.sku || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
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
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-11 w-11">
                              <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditVariant(v)}>
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive">
                                Supprimer
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
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
