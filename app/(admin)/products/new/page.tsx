import { redirect } from "next/navigation";
import { createDraftProduct } from "@/actions/admin/products";

export default async function NewProductPage() {
  const result = await createDraftProduct();

  if (result.success && result.id) {
    redirect(`/products/${result.id}/edit?new=1`);
  }

  // Fallback — should not happen
  redirect("/products");
}
