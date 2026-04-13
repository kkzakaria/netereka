import type { ToolResult, ToolContext } from "../types";

export async function getDeliveryZones(
  ctx: ToolContext
): Promise<ToolResult & { data: unknown[] }> {
  const { results } = await ctx.db
    .prepare("SELECT id, name, commune, fee, estimated_hours FROM delivery_zones WHERE is_active = 1 ORDER BY name ASC")
    .all<{ id: string; name: string; commune: string; fee: number; estimated_hours: number }>();

  return {
    success: true,
    data: results.map((z) => ({
      name: z.name,
      commune: z.commune,
      fee: z.fee,
      estimated_hours: z.estimated_hours,
    })),
  };
}
