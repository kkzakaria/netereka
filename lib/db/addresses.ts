import { query, queryFirst } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { nanoid } from "nanoid";
import type { Address } from "@/lib/db/types";

export async function getUserAddresses(userId: string): Promise<Address[]> {
  return query<Address>(
    "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
    [userId]
  );
}

export async function getAddressById(id: string, userId: string): Promise<Address | null> {
  return queryFirst<Address>(
    "SELECT * FROM addresses WHERE id = ? AND user_id = ?",
    [id, userId]
  );
}

export async function createAddress(data: {
  userId: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  commune: string;
  zoneId: string | null;
  instructions: string | null;
}): Promise<string> {
  const id = nanoid();
  const db = await getDB();

  // If this is the user's first address, make it default
  const existing = await queryFirst<{ count: number }>(
    "SELECT COUNT(*) as count FROM addresses WHERE user_id = ?",
    [data.userId]
  );
  const isDefault = existing?.count === 0 ? 1 : 0;

  await db
    .prepare(
      `INSERT INTO addresses (id, user_id, label, full_name, phone, street, commune, zone_id, instructions, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.userId,
      data.label,
      data.fullName,
      data.phone,
      data.street,
      data.commune,
      data.zoneId,
      data.instructions,
      isDefault
    )
    .run();

  return id;
}
