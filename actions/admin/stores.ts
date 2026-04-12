"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, max } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/guards";
import { getDrizzle } from "@/lib/db/drizzle";
import { stores } from "@/lib/db/schema";
import { storeSchema } from "@/lib/validations/store";
import type { ActionResult } from "@/lib/utils";

function revalidateStores() {
  revalidatePath("/stores");
  revalidatePath("/", "layout");
}

export async function createStore(
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  const parsed = storeSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((e: { message: string }) => e.message)
      .join(", ");
    return { success: false, error: msg };
  }

  try {
    const data = parsed.data;
    const db = await getDrizzle();

    const [maxRow] = await db
      .select({ maxOrder: max(stores.sort_order) })
      .from(stores);
    const nextOrder = (maxRow.maxOrder ?? -1) + 1;

    const id = nanoid();
    await db.insert(stores).values({
      id,
      name: data.name,
      address: data.address,
      google_maps_url: data.google_maps_url,
      phone: data.phone || null,
      email: data.email || null,
      opening_hours: data.opening_hours || null,
      sort_order: nextOrder,
    });

    revalidateStores();
    return { success: true, id };
  } catch (error) {
    console.error("[admin/stores] createStore error:", error);
    return { success: false, error: "Erreur lors de la création de la boutique" };
  }
}

export async function updateStore(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  if (!id) return { success: false, error: "ID boutique invalide" };

  const raw = Object.fromEntries(formData);
  const parsed = storeSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((e: { message: string }) => e.message)
      .join(", ");
    return { success: false, error: msg };
  }

  try {
    const data = parsed.data;
    const db = await getDrizzle();

    const existing = await db.query.stores.findFirst({
      where: eq(stores.id, id),
      columns: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Boutique introuvable" };
    }

    await db
      .update(stores)
      .set({
        name: data.name,
        address: data.address,
        google_maps_url: data.google_maps_url,
        phone: data.phone || null,
        email: data.email || null,
        opening_hours: data.opening_hours || null,
        sort_order: data.sort_order,
        updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      })
      .where(eq(stores.id, id));

    revalidateStores();
    return { success: true, id };
  } catch (error) {
    console.error("[admin/stores] updateStore error:", error);
    return {
      success: false,
      error: "Erreur lors de la mise à jour de la boutique",
    };
  }
}

export async function toggleStoreActive(
  id: string
): Promise<ActionResult> {
  await requireAdmin();

  if (!id) return { success: false, error: "ID boutique invalide" };

  try {
    const db = await getDrizzle();

    const store = await db.query.stores.findFirst({
      where: eq(stores.id, id),
      columns: { is_active: true },
    });

    if (!store) {
      return { success: false, error: "Boutique introuvable" };
    }

    await db
      .update(stores)
      .set({
        is_active: store.is_active === 1 ? 0 : 1,
        updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      })
      .where(eq(stores.id, id));

    revalidateStores();
    return { success: true };
  } catch (error) {
    console.error("[admin/stores] toggleStoreActive error:", error);
    return {
      success: false,
      error: "Erreur lors du changement de statut",
    };
  }
}

export async function deleteStore(id: string): Promise<ActionResult> {
  await requireAdmin();

  if (!id) return { success: false, error: "ID boutique invalide" };

  try {
    const db = await getDrizzle();

    const existing = await db.query.stores.findFirst({
      where: eq(stores.id, id),
      columns: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Boutique introuvable" };
    }

    await db.delete(stores).where(eq(stores.id, id));

    revalidateStores();
    return { success: true };
  } catch (error) {
    console.error("[admin/stores] deleteStore error:", error);
    return {
      success: false,
      error: "Erreur lors de la suppression de la boutique",
    };
  }
}
