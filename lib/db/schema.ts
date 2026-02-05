import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// =============================================================================
// Legacy users table (kept for historical FK references, not used by auth)
// =============================================================================
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  phone: text("phone").unique(),
  password_hash: text("password_hash"),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  role: text("role", { enum: ["customer", "admin", "super_admin"] }).notNull().default("customer"),
  auth_provider: text("auth_provider", { enum: ["email", "google", "apple"] }).notNull().default("email"),
  avatar_url: text("avatar_url"),
  is_verified: integer("is_verified").notNull().default(0),
  is_active: integer("is_active").notNull().default(1),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_phone").on(table.phone),
  index("idx_users_is_active").on(table.is_active),
]);

// =============================================================================
// Better Auth tables
// =============================================================================
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: integer("emailVerified").notNull().default(0),
  image: text("image"),
  phone: text("phone"),
  role: text("role", { enum: ["customer", "admin", "super_admin"] }).notNull().default("customer"),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_user_email").on(table.email),
]);

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: text("expiresAt").notNull(),
  token: text("token").unique().notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [
  index("idx_session_userId").on(table.userId),
  index("idx_session_token").on(table.token),
]);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: text("accessTokenExpiresAt"),
  refreshTokenExpiresAt: text("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_account_userId").on(table.userId),
  uniqueIndex("idx_account_provider").on(table.providerId, table.accountId),
]);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: text("expiresAt").notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
});

// =============================================================================
// Delivery Zones
// =============================================================================
export const deliveryZones = sqliteTable("delivery_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  commune: text("commune").notNull(),
  fee: integer("fee").notNull(),
  estimated_hours: integer("estimated_hours").notNull().default(24),
  is_active: integer("is_active").notNull().default(1),
});

// =============================================================================
// Addresses
// =============================================================================
export const addresses = sqliteTable("addresses", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => user.id),
  label: text("label").notNull().default("Domicile"),
  full_name: text("full_name").notNull(),
  phone: text("phone").notNull(),
  street: text("street").notNull(),
  commune: text("commune").notNull(),
  city: text("city").notNull().default("Abidjan"),
  zone_id: text("zone_id").references(() => deliveryZones.id),
  instructions: text("instructions"),
  is_default: integer("is_default").notNull().default(0),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_addresses_user").on(table.user_id),
]);

// =============================================================================
// Categories
// =============================================================================
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  image_url: text("image_url"),
  parent_id: text("parent_id").references((): ReturnType<typeof text> => categories.id),
  sort_order: integer("sort_order").notNull().default(0),
  is_active: integer("is_active").notNull().default(1),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_categories_slug").on(table.slug),
  index("idx_categories_parent").on(table.parent_id),
]);

// =============================================================================
// Products
// =============================================================================
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  category_id: text("category_id").notNull().references(() => categories.id),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  short_description: text("short_description"),
  base_price: integer("base_price").notNull(),
  compare_price: integer("compare_price"),
  sku: text("sku").unique(),
  brand: text("brand"),
  is_active: integer("is_active").notNull().default(1),
  is_featured: integer("is_featured").notNull().default(0),
  stock_quantity: integer("stock_quantity").notNull().default(0),
  low_stock_threshold: integer("low_stock_threshold").notNull().default(5),
  weight_grams: integer("weight_grams"),
  meta_title: text("meta_title"),
  meta_description: text("meta_description"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_products_slug").on(table.slug),
  index("idx_products_category").on(table.category_id),
  index("idx_products_active").on(table.is_active),
  index("idx_products_featured").on(table.is_featured),
]);

// =============================================================================
// Product Variants
// =============================================================================
export const productVariants = sqliteTable("product_variants", {
  id: text("id").primaryKey(),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku").unique(),
  price: integer("price").notNull(),
  compare_price: integer("compare_price"),
  stock_quantity: integer("stock_quantity").notNull().default(0),
  attributes: text("attributes").notNull().default("{}"),
  is_active: integer("is_active").notNull().default(1),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_product_variants_product").on(table.product_id),
]);

// =============================================================================
// Product Images
// =============================================================================
export const productImages = sqliteTable("product_images", {
  id: text("id").primaryKey(),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  sort_order: integer("sort_order").notNull().default(0),
  is_primary: integer("is_primary").notNull().default(0),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_product_images_product").on(table.product_id),
]);

// =============================================================================
// Product Attributes
// =============================================================================
export const productAttributes = sqliteTable("product_attributes", {
  id: text("id").primaryKey(),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  value: text("value").notNull(),
}, (table) => [
  index("idx_product_attributes_product").on(table.product_id),
]);

// =============================================================================
// Promo Codes
// =============================================================================
export const promoCodes = sqliteTable("promo_codes", {
  id: text("id").primaryKey(),
  code: text("code").unique().notNull(),
  description: text("description"),
  discount_type: text("discount_type", { enum: ["percentage", "fixed"] }).notNull(),
  discount_value: integer("discount_value").notNull(),
  min_order_amount: integer("min_order_amount"),
  max_uses: integer("max_uses"),
  used_count: integer("used_count").notNull().default(0),
  starts_at: text("starts_at"),
  expires_at: text("expires_at"),
  is_active: integer("is_active").notNull().default(1),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_promo_codes_code").on(table.code),
]);

// =============================================================================
// Orders
// =============================================================================
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => user.id),
  order_number: text("order_number").unique().notNull(),
  status: text("status", {
    enum: ["pending", "confirmed", "preparing", "shipping", "delivered", "cancelled", "returned"],
  }).notNull().default("pending"),
  subtotal: integer("subtotal").notNull(),
  delivery_fee: integer("delivery_fee").notNull(),
  discount_amount: integer("discount_amount").notNull().default(0),
  total: integer("total").notNull(),
  promo_code_id: text("promo_code_id").references(() => promoCodes.id),
  delivery_address: text("delivery_address").notNull(),
  delivery_commune: text("delivery_commune").notNull(),
  delivery_phone: text("delivery_phone").notNull(),
  delivery_instructions: text("delivery_instructions"),
  estimated_delivery: text("estimated_delivery"),
  delivered_at: text("delivered_at"),
  cancelled_at: text("cancelled_at"),
  cancellation_reason: text("cancellation_reason"),
  // Admin fields (added in migration 0005)
  internal_notes: text("internal_notes"),
  delivery_person_id: text("delivery_person_id"),
  delivery_person_name: text("delivery_person_name"),
  confirmed_at: text("confirmed_at"),
  preparing_at: text("preparing_at"),
  shipping_at: text("shipping_at"),
  returned_at: text("returned_at"),
  return_reason: text("return_reason"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_orders_user").on(table.user_id),
  index("idx_orders_status").on(table.status),
  index("idx_orders_number").on(table.order_number),
]);

// =============================================================================
// Order Items
// =============================================================================
export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  order_id: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  product_id: text("product_id").notNull().references(() => products.id),
  variant_id: text("variant_id").references(() => productVariants.id),
  product_name: text("product_name").notNull(),
  variant_name: text("variant_name"),
  quantity: integer("quantity").notNull(),
  unit_price: integer("unit_price").notNull(),
  total_price: integer("total_price").notNull(),
}, (table) => [
  index("idx_order_items_order").on(table.order_id),
]);

// =============================================================================
// Reviews
// =============================================================================
export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  user_id: text("user_id").notNull().references(() => user.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  is_verified_purchase: integer("is_verified_purchase").notNull().default(0),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_reviews_product").on(table.product_id),
  index("idx_reviews_user").on(table.user_id),
]);

// =============================================================================
// Order Status History (audit trail)
// =============================================================================
export const orderStatusHistory = sqliteTable("order_status_history", {
  id: text("id").primaryKey(),
  order_id: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  from_status: text("from_status"),
  to_status: text("to_status").notNull(),
  changed_by: text("changed_by").notNull(),
  note: text("note"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_order_status_history_order").on(table.order_id),
]);

// =============================================================================
// Wishlist
// =============================================================================
export const wishlist = sqliteTable("wishlist", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  product_id: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("wishlist_user_product_unique").on(table.user_id, table.product_id),
  index("idx_wishlist_user").on(table.user_id),
  index("idx_wishlist_product").on(table.product_id),
]);
