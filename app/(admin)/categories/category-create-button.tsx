"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/admin/category-form";
import type { Category } from "@/lib/db/types";

export function CategoryCreateButton({ categories = [] }: { categories?: Category[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nouvelle catégorie</Button>
      <CategoryForm open={open} onOpenChange={setOpen} categories={categories} />
    </>
  );
}
