"use client";

import { memo, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/lib/utils/images";
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
import {
  deleteProduct,
  toggleProductActive,
  toggleProductFeatured,
} from "@/actions/admin/products";

interface ProductRowData {
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

// Hoisted static elements (rendering-hoist-jsx)
const imagePlaceholder = <div className="h-10 w-10 rounded bg-muted" />;
const moreIcon = <HugeiconsIcon icon={MoreVerticalIcon} size={18} />;

// Memoized row component for better performance (rerender-memo)
const ProductRow = memo(function ProductRow({
  product,
  onToggleActive,
  onToggleFeatured,
  onDelete,
}: {
  product: ProductRowData;
  onToggleActive: (id: string) => void;
  onToggleFeatured: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <TableRow
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 56px" }}
      className="transition-colors hover:bg-muted/50"
    >
      <TableCell>
        {product.image_url ? (
          <Image
            src={getImageUrl(product.image_url)}
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
      <TableCell className="hidden sm:table-cell">
        <div className="flex gap-1">
          {product.is_active === 1 ? (
            <Badge variant="default">Actif</Badge>
          ) : (
            <Badge variant="secondary">Inactif</Badge>
          )}
          {product.is_featured === 1 ? (
            <Badge variant="outline">Vedette</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11">
                {moreIcon}
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/products/${product.id}/edit`}>Modifier</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleActive(product.id)}
              >
                {product.is_active === 1 ? "Désactiver" : "Activer"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleFeatured(product.id)}
              >
                {product.is_featured === 1 ? "Retirer vedette" : "Mettre en vedette"}
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
              <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement &quot;{product.name}&quot;
                ainsi que ses variantes et images.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(product.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
});

export function ProductTable({ products }: { products: ProductRowData[] }) {
  const [isPending, startTransition] = useTransition();

  const handleToggleActive = useCallback((id: string) => {
    startTransition(async () => {
      const result = await toggleProductActive(id);
      if (!result.success) toast.error(result.error);
    });
  }, []);

  const handleToggleFeatured = useCallback((id: string) => {
    startTransition(async () => {
      const result = await toggleProductFeatured(id);
      if (!result.success) toast.error(result.error);
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.success) {
        toast.success("Produit supprimé");
      } else {
        toast.error(result.error);
      }
    });
  }, []);

  if (products.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Aucun produit trouvé
      </div>
    );
  }

  return (
    <div className="rounded-lg border touch-manipulation" data-pending={isPending || undefined}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Image</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead className="hidden md:table-cell">SKU</TableHead>
            <TableHead className="hidden sm:table-cell">Catégorie</TableHead>
            <TableHead>Prix</TableHead>
            <TableHead className="hidden md:table-cell">Stock</TableHead>
            <TableHead className="hidden sm:table-cell">Statut</TableHead>
            <TableHead className="w-14"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onToggleActive={handleToggleActive}
              onToggleFeatured={handleToggleFeatured}
              onDelete={handleDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
