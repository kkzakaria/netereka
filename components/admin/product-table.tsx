"use client";

import Link from "next/link";
import Image from "next/image";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import {
  deleteProduct,
  toggleProductActive,
  toggleProductFeatured,
} from "@/actions/admin/products";

interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  category_name?: string | null;
  base_price: number;
  stock_quantity: number;
  is_active: number;
  is_featured: number;
  image_url?: string | null;
}

const imagePlaceholder = <div className="h-10 w-10 rounded bg-muted" />;

export function ProductTable({ products }: { products: ProductRow[] }) {
  const [isPending, startTransition] = useTransition();

  function handleToggleActive(id: string) {
    startTransition(async () => {
      const result = await toggleProductActive(id);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleToggleFeatured(id: string) {
    startTransition(async () => {
      const result = await toggleProductFeatured(id);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.success) {
        toast.success("Produit supprimé");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucun produit trouvé
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Image</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead className="hidden md:table-cell">SKU</TableHead>
            <TableHead className="hidden sm:table-cell">Catégorie</TableHead>
            <TableHead>Prix</TableHead>
            <TableHead className="hidden md:table-cell">Stock</TableHead>
            <TableHead className="w-16">Actif</TableHead>
            <TableHead className="w-16 hidden sm:table-cell">Vedette</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} data-pending={isPending || undefined}>
              <TableCell>
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    width={40}
                    height={40}
                    className="rounded object-cover"
                  />
                ) : (
                  imagePlaceholder
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/products/${product.id}/edit`}
                  className="font-medium hover:underline"
                >
                  {product.name}
                </Link>
                {product.brand ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {product.brand}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                {product.sku || "—"}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {product.category_name ? (
                  <Badge variant="secondary">{product.category_name}</Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {formatPrice(product.base_price)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge
                  variant={product.stock_quantity <= 5 ? "destructive" : "secondary"}
                >
                  {product.stock_quantity}
                </Badge>
              </TableCell>
              <TableCell>
                <Switch
                  checked={product.is_active === 1}
                  onCheckedChange={() => handleToggleActive(product.id)}
                />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Switch
                  checked={product.is_featured === 1}
                  onCheckedChange={() => handleToggleFeatured(product.id)}
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="xs" asChild>
                    <Link href={`/products/${product.id}/edit`}>Modifier</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="xs" className="text-destructive">
                        Suppr.
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprimera définitivement &quot;{product.name}&quot;
                          ainsi que ses variantes et images.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(product.id)}
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
  );
}
