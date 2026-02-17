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
import {
  MoreVerticalIcon,
  ArrowRight01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import type { CategoryWithCount } from "@/lib/db/admin/categories";
import type { Category } from "@/lib/db/types";
import { deleteCategory } from "@/actions/admin/categories";
import { CategoryForm } from "./category-form";

export function CategoryTable({
  categories,
  allCategories = [],
  expandedIds,
  onToggleExpand,
  childCount,
}: {
  categories: CategoryWithCount[];
  allCategories?: Category[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  childCount: (id: string) => number;
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
      <div className="rounded-lg border touch-manipulation">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Produits</TableHead>
              <TableHead>Ordre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-14"><span className="sr-only">Actions</span></TableHead>
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
                const isExpanded = expandedIds.has(cat.id);
                return (
                  <TableRow
                    key={cat.id}
                    data-pending={isPending || undefined}
                    data-expanded={children > 0 && isExpanded ? "" : undefined}
                    className={`data-[expanded]:bg-muted/30${cat.depth > 0 ? " bg-muted/50" : ""}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${cat.depth * 1.5}rem` }}>
                        {children > 0 ? (
                          <button
                            onClick={() => onToggleExpand(cat.id)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? `Replier ${cat.name}` : `Déplier ${cat.name}`}
                          >
                            <HugeiconsIcon
                              icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                              size={16}
                              aria-hidden="true"
                            />
                          </button>
                        ) : (
                          <span className="w-6 shrink-0" />
                        )}
                        <div>
                          <span>
                            {cat.depth > 0 && (
                              <span className="mr-1 text-muted-foreground">↳</span>
                            )}
                            {cat.name}
                          </span>
                          {children > 0 && !isExpanded && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {children} sous-cat.
                            </Badge>
                          )}
                          {cat.parent_name && (
                            <p className="text-xs text-muted-foreground">{cat.parent_name}</p>
                          )}
                        </div>
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
