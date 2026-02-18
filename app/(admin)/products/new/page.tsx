import { redirect } from "next/navigation";
import { createDraftProduct } from "@/actions/admin/products";

export default async function NewProductPage() {
  const result = await createDraftProduct();

  if (result.success && result.id) {
    redirect(`/products/${result.id}/edit`);
  }

  // Draft creation failed (e.g. database error)
  throw new Error(`Failed to create draft product: ${result.error ?? "unknown error"}`);
}
