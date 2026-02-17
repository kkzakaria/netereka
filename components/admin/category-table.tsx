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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import type { CategoryWithCount } from "@/lib/db/admin/categories";
import type { Category } from "@/lib/db/types";
import { deleteCategory } from "@/actions/admin/categories";
import { CategoryForm } from "./category-form";

export function CategoryTable({
  categories,
  allCategories = [],
}: {
  categories: CategoryWithCount[];
  allCategories?: Category[];
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

  // Count children for delete warning
  function childCount(id: string): number {
    return categories.filter((c) => c.parent_id === id).length;
  }

  return (
    <>
      <div className="rounded-lg border touch-manipulation">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Produits</TableHead>
              <TableHead>Ordre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-14"></TableHead>
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
              categories.map((cat) => {
                const children = childCount(cat.id);
                return (
                  <TableRow key={cat.id} data-pending={isPending || undefined}>
                    <TableCell className="font-medium">
                      <div style={{ paddingLeft: `${cat.depth * 1.5}rem` }}>
                        <span>
                          {cat.depth > 0 && (
                            <span className="mr-1 text-muted-foreground">↳</span>
                          )}
                          {cat.name}
                        </span>
                        {cat.parent_name && (
                          <p className="text-xs text-muted-foreground">{cat.parent_name}</p>
                        )}
                      </div>
                    </TableCell>
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
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-11 w-11">
                              <HugeiconsIcon icon={MoreVerticalIcon} size={18} />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditCategory(cat)}>
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
                              Supprimer cette catégorie ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              La catégorie &quot;{cat.name}&quot; sera supprimée.
                              {cat.product_count > 0 &&
                                ` Elle contient ${cat.product_count} produit(s) — la suppression sera bloquée.`}
                              {children > 0 &&
                                ` Elle contient ${children} sous-catégorie(s) — la suppression sera bloquée.`}
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryForm
        key={editCategory?.id}
        category={editCategory}
        categories={allCategories}
        open={!!editCategory}
        onOpenChange={(open) => {
          if (!open) setEditCategory(null);
        }}
      />
    </>
  );
}
