import { query } from "@/lib/db";
import type { DeliveryZone } from "@/lib/db/types";

export async function getActiveDeliveryZones(): Promise<DeliveryZone[]> {
  return query<DeliveryZone>(
    "SELECT * FROM delivery_zones WHERE is_active = 1 ORDER BY name ASC"
  );
}

export async function getDeliveryZoneByCommune(commune: string): Promise<DeliveryZone | null> {
  const zones = await query<DeliveryZone>(
    "SELECT * FROM delivery_zones WHERE commune = ? AND is_active = 1 LIMIT 1",
    [commune]
  );
  return zones[0] ?? null;
}
