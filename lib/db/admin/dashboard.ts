import { queryFirst } from "@/lib/db";

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  lowStockCount: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [total, active, categories, lowStock] = await Promise.all([
    queryFirst<{ count: number }>("SELECT COUNT(*) as count FROM products"),
    queryFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM products WHERE is_active = 1"
    ),
    queryFirst<{ count: number }>("SELECT COUNT(*) as count FROM categories"),
    queryFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM products WHERE stock_quantity <= 5 AND is_active = 1"
    ),
  ]);

  return {
    totalProducts: total?.count ?? 0,
    activeProducts: active?.count ?? 0,
    totalCategories: categories?.count ?? 0,
    lowStockCount: lowStock?.count ?? 0,
  };
}
