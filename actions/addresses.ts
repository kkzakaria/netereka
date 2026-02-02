"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { addressSchema, type AddressInput } from "@/lib/validations/address";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getAddressById,
} from "@/lib/db/addresses";
import { getDeliveryZoneByCommune } from "@/lib/db/delivery-zones";

interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createAddressAction(input: AddressInput): Promise<ActionResult> {
  const session = await requireAuth();

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Données invalides",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const zone = await getDeliveryZoneByCommune(parsed.data.commune);

  await createAddress({
    userId: session.user.id,
    label: parsed.data.label,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    street: parsed.data.street,
    commune: parsed.data.commune,
    zoneId: zone?.id ?? null,
    instructions: parsed.data.instructions ?? null,
  });

  revalidatePath("/account/addresses");
  return { success: true };
}

export async function updateAddressAction(
  id: string,
  input: AddressInput
): Promise<ActionResult> {
  const session = await requireAuth();

  const existing = await getAddressById(id, session.user.id);
  if (!existing) {
    return { success: false, error: "Adresse introuvable" };
  }

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Données invalides",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const zone = await getDeliveryZoneByCommune(parsed.data.commune);

  await updateAddress(id, session.user.id, {
    label: parsed.data.label,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    street: parsed.data.street,
    commune: parsed.data.commune,
    zoneId: zone?.id ?? null,
    instructions: parsed.data.instructions ?? null,
  });

  revalidatePath("/account/addresses");
  return { success: true };
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const session = await requireAuth();
  const deleted = await deleteAddress(id, session.user.id);
  if (!deleted) {
    return { success: false, error: "Adresse introuvable" };
  }
  revalidatePath("/account/addresses");
  return { success: true };
}

export async function setDefaultAddressAction(id: string): Promise<ActionResult> {
  const session = await requireAuth();
  await setDefaultAddress(id, session.user.id);
  revalidatePath("/account/addresses");
  return { success: true };
}
