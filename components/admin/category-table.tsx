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
import type { CategoryWithCount } from "@/lib/db/admin/categories";
import { deleteCategory } from "@/actions/admin/categories";
import { CategoryForm } from "./category-form";

export function CategoryTable({
  categories,
}: {
  categories: CategoryWithCount[];
}) {
  const [editCategory, setEditCategory] = useState<CategoryWithCount | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.success) {
        toast.success("Catégorie supprimée");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Produits</TableHead>
              <TableHead>Ordre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Aucune catégorie
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id} data-pending={isPending || undefined}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cat.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{cat.product_count}</Badge>
                  </TableCell>
                  <TableCell>{cat.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={cat.is_active ? "default" : "secondary"}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditCategory(cat)}
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
                              Supprimer cette catégorie ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              La catégorie &quot;{cat.name}&quot; sera supprimée.
                              {cat.product_count > 0 &&
                                ` Elle contient ${cat.product_count} produit(s) — la suppression sera bloquée.`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(cat.id)}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryForm
        category={editCategory}
        open={!!editCategory}
        onOpenChange={(open) => {
          if (!open) setEditCategory(null);
        }}
      />
    </>
  );
}
