export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  compare_price: number | null;
  sku: string | null;
  brand: string | null;
  is_active: number;
  is_featured: number;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  image_url?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  variant_count?: number;
}

/** Minimal product fields for client-side cards (server-serialization optimization). */
export type ProductCardData = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "base_price"
  | "compare_price"
  | "brand"
  | "is_featured"
  | "stock_quantity"
  | "image_url"
  | "category_name"
  | "variant_count"
>;

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  compare_price: number | null;
  stock_quantity: number;
  attributes: string; // JSON string
  is_active: number;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_primary: number;
}

export interface ProductAttribute {
  id: string;
  product_id: string;
  name: string;
  value: string;
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
  attributes: ProductAttribute[];
}

export interface ParsedVariantAttributes {
  color?: string;
  storage?: string;
  ram?: string;
  [key: string]: string | undefined;
}

export interface DeliveryZone {
  id: string;
  name: string;
  commune: string;
  fee: number;
  estimated_hours: number;
  is_active: number;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  street: string;
  city: string;
  commune: string;
  zone_id: string | null;
  instructions: string | null;
  is_default: number;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  promo_code_id: string | null;
  delivery_address: string;
  delivery_commune: string;
  delivery_phone: string;
  delivery_instructions: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  // Admin-specific fields
  internal_notes: string | null;
  delivery_person_id: string | null;
  delivery_person_name: string | null;
  confirmed_at: string | null;
  preparing_at: string | null;
  shipping_at: string | null;
  returned_at: string | null;
  return_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

/** Maximum category hierarchy depth (0-indexed). Root = 0, max child depth = MAX_CATEGORY_DEPTH. */
export const MAX_CATEGORY_DEPTH = 2;

export interface CategoryNode extends Category {
  readonly children: readonly CategoryNode[];
}

/** Minimal category node for client-side sidebar (server-serialization optimization). */
export interface SidebarCategoryNode {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly children: readonly SidebarCategoryNode[];
}

export interface SearchOptions {
  query?: string;
  category?: string; // category slug
  categoryIds?: string[]; // category IDs for aggregated search (parent + descendants)
  brands?: string[]; // brand names
  minPrice?: number;
  maxPrice?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
  limit?: number;
  offset?: number;
}

export interface SearchSuggestion {
  slug: string;
  name: string;
  brand: string | null;
  base_price: number;
  image_url: string | null;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: number;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  // Joined from products
  name: string;
  slug: string;
  base_price: number;
  compare_price: number | null;
  brand: string | null;
  stock_quantity: number;
  is_active: number;
  image_url: string | null;
  category_name: string | null;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified_purchase: number;
  created_at: string;
  // Joined fields
  user_name?: string;
  product_name?: string;
  product_slug?: string;
  product_image_url?: string | null;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "returned";

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  note: string | null;
  created_at: string;
}

export interface AdminOrder extends Order {
  item_count: number;
  user_email: string;
  user_name: string;
  user_phone: string | null;
}

export interface AdminOrderDetail extends Order {
  items: OrderItem[];
  status_history: OrderStatusHistory[];
  user_email: string;
  user_name: string;
  user_phone: string | null;
}

// Customer Management Types
export type UserRole = "customer" | "admin" | "super_admin";

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  emailVerified: number;
  image: string | null;
  is_active: number;
  createdAt: string;
  order_count: number;
  total_spent: number;
}

export interface AdminCustomerDetail extends AdminCustomer {
  addresses: Address[];
  recent_orders: AdminOrder[];
}

/** Order data for admin list views (table/cards). */
export type OrderListItem = Pick<
  AdminOrder,
  'id' | 'order_number' | 'created_at' | 'user_name' |
  'delivery_phone' | 'delivery_commune' | 'total' | 'item_count' | 'status'
>;

/** Customer data for admin sidebar actions. */
export type CustomerSidebarData = Pick<
  AdminCustomerDetail,
  'id' | 'order_count' | 'total_spent' | 'createdAt' | 'role' | 'is_active'
>;

// Audit Log Types
export type AuditAction =
  | "user.role_changed"
  | "user.activated"
  | "user.deactivated";

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  action: AuditAction;
  target_type: string;
  target_id: string;
  details: string | null;
  created_at: string;
}

export type BadgeColor = "mint" | "red" | "orange" | "blue";

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  badge_color: BadgeColor;
  image_url: string | null;
  link_url: string;
  cta_text: string;
  price: number | null;
  bg_gradient_from: string;
  bg_gradient_to: string;
  display_order: number;
  is_active: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}
