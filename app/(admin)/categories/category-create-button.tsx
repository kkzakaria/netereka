"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/admin/category-form";

export function CategoryCreateButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nouvelle catégorie</Button>
      <CategoryForm open={open} onOpenChange={setOpen} />
    </>
  );
}
