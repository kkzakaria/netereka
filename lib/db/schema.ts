import { sqliteTable, text, integer, uniqueIndex, index, check, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
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
  role: text("role", { enum: ["customer", "agent", "admin", "super_admin"] }).notNull().default("customer"),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
  banned: integer("banned").notNull().default(0),
  banReason: text("banReason"),
  banExpires: text("banExpires"),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: text("expiresAt").notNull(),
  token: text("token").unique().notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  // Colonne du plugin admin (impersonation). better-auth 1.7 vérifie le schéma au
  // premier appel et lève SCHEMA_MISMATCH si elle manque : sans elle, toutes les
  // routes d'auth répondraient 500.
  impersonatedBy: text("impersonatedBy"),
}, (table) => [
  index("idx_session_userId").on(table.userId),
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

// better-auth's database-backed rate limiter (rateLimit.storage: "database" in
// lib/auth/index.ts). Columns mirror the model in
// node_modules/@better-auth/core/dist/db/get-tables.mjs exactly — better-auth
// talks to this table through its own Kysely adapter, not Drizzle, so a
// column-name mismatch here would fail silently at request time rather than
// at compile time.
export const rateLimit = sqliteTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").unique().notNull(),
  count: integer("count").notNull(),
  lastRequest: integer("lastRequest").notNull(),
});

// LEGACY (better-auth 1.6, plugin mcp du cœur) : plus lu ni écrit depuis la 1.7.
// À supprimer dans une PR contract séparée, une fois le déploiement 1.7 promu à
// 100 % (DROP TABLE interdit pendant le canary, voir
// scripts/check-migration-safety.mjs).
// better-auth `mcp` plugin (OAuth 2.1 provider for MCP clients). Column names
// mirror node_modules/better-auth/dist/plugins/oidc-provider/schema.mjs exactly:
// better-auth reaches these tables through its own Kysely adapter, so a
// mismatch here fails at request time, not at compile time. Dates are ISO
// strings (the adapter runs with supportsDates: false on sqlite), booleans 0/1.
export const oauthApplication = sqliteTable("oauthApplication", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  metadata: text("metadata"),
  clientId: text("clientId").unique().notNull(),
  clientSecret: text("clientSecret"),
  redirectUrls: text("redirectUrls").notNull(),
  type: text("type").notNull(),
  disabled: integer("disabled").notNull().default(0),
  userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_oauthApplication_userId").on(table.userId),
]);

export const oauthAccessToken = sqliteTable("oauthAccessToken", {
  id: text("id").primaryKey(),
  accessToken: text("accessToken").unique().notNull(),
  refreshToken: text("refreshToken").unique().notNull(),
  accessTokenExpiresAt: text("accessTokenExpiresAt").notNull(),
  refreshTokenExpiresAt: text("refreshTokenExpiresAt").notNull(),
  clientId: text("clientId").notNull().references(() => oauthApplication.clientId, { onDelete: "cascade" }),
  userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
  scopes: text("scopes").notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_oauthAccessToken_clientId").on(table.clientId),
  index("idx_oauthAccessToken_userId").on(table.userId),
]);

export const oauthConsent = sqliteTable("oauthConsent", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull().references(() => oauthApplication.clientId, { onDelete: "cascade" }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  scopes: text("scopes").notNull(),
  consentGiven: integer("consentGiven").notNull().default(0),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_oauthConsent_clientId").on(table.clientId),
  index("idx_oauthConsent_userId").on(table.userId),
]);

// better-auth 1.7 : jwt() + mcp() (fournisseur OAuth 2.1, @better-auth/oauth-provider)
// + cimd(). Les colonnes reproduisent exactement ce que getMigrations() de
// better-auth calcule pour ces plugins (better-auth y accède par son propre
// adaptateur Kysely : une divergence échoue à l'exécution, pas à la compilation).
// Dates = chaînes ISO (l'adaptateur tourne avec supportsDates: false sur sqlite),
// booléens = 0/1, tableaux et JSON = texte JSON.

// Deux tables du fournisseur portent un nom différent du modèle better-auth
// (oauthProviderAccessToken, oauthProviderConsent, voir mcp({ schema }) dans
// lib/auth/index.ts) : oauthAccessToken et oauthConsent existent déjà avec le
// schéma 1.6 ci-dessus, et les recréer exigerait un DROP TABLE, interdit
// pendant le canary (expand/contract). Migration purement additive.

// Clés de signature des jetons d'accès JWT (publiées sur /api/auth/jwks).
export const jwks = sqliteTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("publicKey").notNull(),
  privateKey: text("privateKey").notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  expiresAt: text("expiresAt"),
  alg: text("alg"),
  crv: text("crv"),
});

// Un client OAuth : ici, uniquement des clients découverts par CIMD (le client_id
// est l'URL HTTPS de son document de métadonnées). Aucun enregistrement anonyme.
export const oauthClient = sqliteTable("oauthClient", {
  id: text("id").primaryKey(),
  clientId: text("clientId").unique().notNull(),
  clientSecret: text("clientSecret"),
  clientDiscoveryId: text("clientDiscoveryId"),
  disabled: integer("disabled"),
  skipConsent: integer("skipConsent"),
  enableEndSession: integer("enableEndSession"),
  subjectType: text("subjectType"),
  scopes: text("scopes"),
  clientCredentialsScopes: text("clientCredentialsScopes"),
  userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
  createdAt: text("createdAt"),
  updatedAt: text("updatedAt"),
  name: text("name"),
  uri: text("uri"),
  icon: text("icon"),
  contacts: text("contacts"),
  tos: text("tos"),
  policy: text("policy"),
  softwareId: text("softwareId"),
  softwareVersion: text("softwareVersion"),
  softwareStatement: text("softwareStatement"),
  redirectUris: text("redirectUris").notNull(),
  postLogoutRedirectUris: text("postLogoutRedirectUris"),
  backchannelLogoutUri: text("backchannelLogoutUri"),
  backchannelLogoutSessionRequired: integer("backchannelLogoutSessionRequired"),
  tokenEndpointAuthMethod: text("tokenEndpointAuthMethod"),
  applicationType: text("applicationType"),
  jwks: text("jwks"),
  jwksUri: text("jwksUri"),
  grantTypes: text("grantTypes"),
  responseTypes: text("responseTypes"),
  requirePKCE: integer("requirePKCE"),
  dpopBoundAccessTokens: integer("dpopBoundAccessTokens"),
  referenceId: text("referenceId"),
  metadata: text("metadata"),
}, (table) => [
  index("oauthClient_userId_idx").on(table.userId),
]);

export const oauthResource = sqliteTable("oauthResource", {
  id: text("id").primaryKey(),
  identifier: text("identifier").unique().notNull(),
  name: text("name").notNull(),
  accessTokenTtl: integer("accessTokenTtl"),
  refreshTokenTtl: integer("refreshTokenTtl"),
  signingAlgorithm: text("signingAlgorithm"),
  signingKeyId: text("signingKeyId"),
  allowedScopes: text("allowedScopes"),
  customClaims: text("customClaims"),
  dpopBoundAccessTokensRequired: integer("dpopBoundAccessTokensRequired"),
  disabled: integer("disabled"),
  createdAt: text("createdAt"),
  updatedAt: text("updatedAt"),
  policyVersion: integer("policyVersion"),
  metadata: text("metadata"),
});

export const oauthClientResource = sqliteTable("oauthClientResource", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  resourceId: text("resourceId").notNull().references(() => oauthResource.identifier, { onDelete: "cascade" }),
  metadata: text("metadata"),
  createdAt: text("createdAt"),
}, (table) => [
  index("oauthClientResource_clientId_idx").on(table.clientId),
  index("oauthClientResource_resourceId_idx").on(table.resourceId),
  uniqueIndex("oauthClientResource_clientId_resourceId_uidx").on(table.clientId, table.resourceId),
]);

export const oauthRefreshToken = sqliteTable("oauthRefreshToken", {
  id: text("id").primaryKey(),
  token: text("token").unique().notNull(),
  clientId: text("clientId").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  sessionId: text("sessionId").references(() => session.id, { onDelete: "set null" }),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("referenceId"),
  authorizationCodeId: text("authorizationCodeId"),
  resources: text("resources"),
  requestedUserInfoClaims: text("requestedUserInfoClaims"),
  expiresAt: text("expiresAt").notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  revoked: text("revoked"),
  rotatedAt: text("rotatedAt"),
  rotationReplayResponse: text("rotationReplayResponse"),
  rotationReplayExpiresAt: text("rotationReplayExpiresAt"),
  authTime: text("authTime"),
  confirmation: text("confirmation"),
  scopes: text("scopes").notNull(),
}, (table) => [
  index("oauthRefreshToken_clientId_idx").on(table.clientId),
  index("oauthRefreshToken_sessionId_idx").on(table.sessionId),
  index("oauthRefreshToken_userId_idx").on(table.userId),
  index("oauthRefreshToken_authorizationCodeId_idx").on(table.authorizationCodeId),
]);

export const oauthProviderAccessToken = sqliteTable("oauthProviderAccessToken", {
  id: text("id").primaryKey(),
  token: text("token").unique().notNull(),
  clientId: text("clientId").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  sessionId: text("sessionId").references(() => session.id, { onDelete: "set null" }),
  userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("referenceId"),
  authorizationCodeId: text("authorizationCodeId"),
  resources: text("resources"),
  requestedUserInfoClaims: text("requestedUserInfoClaims"),
  refreshId: text("refreshId").references(() => oauthRefreshToken.id, { onDelete: "cascade" }),
  expiresAt: text("expiresAt").notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  revoked: text("revoked"),
  confirmation: text("confirmation"),
  scopes: text("scopes").notNull(),
}, (table) => [
  index("oauthProviderAccessToken_clientId_idx").on(table.clientId),
  index("oauthProviderAccessToken_sessionId_idx").on(table.sessionId),
  index("oauthProviderAccessToken_userId_idx").on(table.userId),
  index("oauthProviderAccessToken_authorizationCodeId_idx").on(table.authorizationCodeId),
  index("oauthProviderAccessToken_refreshId_idx").on(table.refreshId),
]);

export const oauthProviderConsent = sqliteTable("oauthProviderConsent", {
  id: text("id").primaryKey(),
  clientId: text("clientId").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("referenceId"),
  resources: text("resources"),
  requestedUserInfoClaims: text("requestedUserInfoClaims"),
  scopes: text("scopes").notNull(),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("oauthProviderConsent_clientId_idx").on(table.clientId),
  index("oauthProviderConsent_userId_idx").on(table.userId),
]);

export const oauthClientAssertion = sqliteTable("oauthClientAssertion", {
  id: text("id").primaryKey(),
  expiresAt: text("expiresAt").notNull(),
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
  parent_id: text("parent_id").references((): AnySQLiteColumn => categories.id),
  sort_order: integer("sort_order").notNull().default(0),
  is_active: integer("is_active").notNull().default(1),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_categories_slug").on(table.slug),
  index("idx_categories_parent").on(table.parent_id),
]);

// =============================================================================
// Products
// =============================================================================
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  category_id: text("category_id").references(() => categories.id),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  description_type: text("description_type").notNull().default("richtext"),
  short_description: text("short_description"),
  base_price: integer("base_price").notNull(),
  compare_price: integer("compare_price"),
  sku: text("sku").unique(),
  brand: text("brand"),
  is_active: integer("is_active").notNull().default(1),
  is_featured: integer("is_featured").notNull().default(0),
  is_draft: integer("is_draft").notNull().default(0),
  stock_quantity: integer("stock_quantity").notNull().default(0),
  low_stock_threshold: integer("low_stock_threshold").notNull().default(5),
  weight_grams: integer("weight_grams"),
  meta_title: text("meta_title"),
  meta_description: text("meta_description"),
  tagline: text("tagline"),
  highlights: text("highlights"),
  feature_blocks: text("feature_blocks"),
  faq: text("faq"),
  faq_html: text("faq_html"),
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
  variant_id: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
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
});

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
  channel: text("channel", { enum: ["web", "whatsapp"] }).notNull().default("web"),
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
  check("rating_range", sql`${table.rating} BETWEEN 1 AND 5`),
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
// Audit Log
// =============================================================================
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actor_id: text("actor_id").notNull(),
  actor_name: text("actor_name").notNull(),
  action: text("action").notNull(),
  target_type: text("target_type").notNull(),
  target_id: text("target_id").notNull(),
  details: text("details"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_audit_log_actor").on(table.actor_id),
  index("idx_audit_log_action").on(table.action),
  index("idx_audit_log_created").on(table.created_at),
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

// =============================================================================
// Banners
// =============================================================================
export const banners = sqliteTable("banners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  badge_text: text("badge_text"),
  badge_color: text("badge_color").notNull().default("mint"),
  image_url: text("image_url"),
  link_url: text("link_url").notNull(),
  cta_text: text("cta_text").notNull().default("Découvrir"),
  price: integer("price"),
  bg_gradient_from: text("bg_gradient_from").notNull().default("#183C78"),
  bg_gradient_to: text("bg_gradient_to").notNull().default("#1E4A8F"),
  content_html: text("content_html"),
  display_order: integer("display_order").notNull().default(0),
  is_active: integer("is_active").notNull().default(1),
  starts_at: text("starts_at"),
  ends_at: text("ends_at"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_banners_active_order").on(table.is_active, table.display_order),
]);

// =============================================================================
// Banner Gradients (saved presets)
// =============================================================================
export const bannerGradients = sqliteTable("banner_gradients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color_from: text("color_from").notNull(),
  color_to: text("color_to").notNull(),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// =============================================================================
// Stores (physical locations)
// =============================================================================
export const stores = sqliteTable("stores", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  google_maps_url: text("google_maps_url").notNull(),
  phone: text("phone"),
  email: text("email"),
  opening_hours: text("opening_hours"),
  is_active: integer("is_active").notNull().default(1),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_stores_active_order").on(table.is_active, table.sort_order),
]);

// =============================================================================
// WhatsApp Configuration
// =============================================================================
export const whatsappConfig = sqliteTable("whatsapp_config", {
  id: integer("id").primaryKey(),
  phone_number_id: text("phone_number_id"),
  display_phone_number: text("display_phone_number"),
  access_token: text("access_token"),
  verify_token: text("verify_token"),
  webhook_secret: text("webhook_secret"),
  business_account_id: text("business_account_id"),
  admin_phones: text("admin_phones").notNull().default("[]"),
  is_active: integer("is_active").notNull().default(0),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// =============================================================================
// AI Config (singleton row: id=1)
// =============================================================================
export const aiConfig = sqliteTable(
  "ai_config",
  {
    id: integer("id").primaryKey(),
    anthropic_api_key: text("anthropic_api_key"),
    brave_api_key: text("brave_api_key"),
    model: text("model"),
    enabled: integer("enabled").notNull().default(1),
    created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
    updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [
    check("ai_config_singleton_id", sql`${table.id} = 1`),
    check("ai_config_enabled_bool", sql`${table.enabled} in (0, 1)`),
  ],
);

// =============================================================================
// WhatsApp Sessions
// =============================================================================
export const whatsappSessions = sqliteTable("whatsapp_sessions", {
  id: text("id").primaryKey(),
  wa_phone: text("wa_phone").unique().notNull(),
  user_id: text("user_id").references(() => user.id),
  // Account pending OTP verification. Written by linkAccount BEFORE the OTP is
  // confirmed; promoted to user_id only by verifyOtp on success. Order tools
  // must never trust pending_user_id — see is_verified gating.
  pending_user_id: text("pending_user_id").references(() => user.id),
  otp_code: text("otp_code"),
  otp_expires_at: text("otp_expires_at"),
  is_verified: integer("is_verified").notNull().default(0),
  status: text("status", { enum: ["active", "escalated", "closed"] }).notNull().default("active"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_wa_sessions_phone").on(table.wa_phone),
  index("idx_wa_sessions_user").on(table.user_id),
]);

// =============================================================================
// WhatsApp Carts
// =============================================================================
export const whatsappCarts = sqliteTable("whatsapp_carts", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull().references(() => whatsappSessions.id, { onDelete: "cascade" }),
  product_id: text("product_id").notNull().references(() => products.id),
  variant_id: text("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").notNull().default(1),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_wa_carts_session").on(table.session_id),
]);

// =============================================================================
// WhatsApp Messages
// =============================================================================
export const whatsappMessages = sqliteTable("whatsapp_messages", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull().references(() => whatsappSessions.id, { onDelete: "cascade" }),
  wa_message_id: text("wa_message_id"),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  content: text("content").notNull(),
  message_type: text("message_type", { enum: ["text", "interactive", "template", "image", "system"] }).notNull().default("text"),
  metadata: text("metadata"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_wa_messages_session").on(table.session_id),
  index("idx_wa_messages_created").on(table.created_at),
  index("idx_wa_messages_wa_id").on(table.wa_message_id),
]);

// =============================================================================
// Révisions de contenu
// =============================================================================

/**
 * Une proposition de modification déposée par un client IA, non appliquée.
 * Le MCP n'écrit jamais directement sur une ligne publiée : il dépose ici, et
 * l'administrateur applique. `payload` est DÉJÀ assaini au dépôt, avec la
 * portée de la ligne cible — voir lib/db/revisions.ts.
 */
export const contentRevisions = sqliteTable("content_revisions", {
  id: text("id").primaryKey(),
  target_type: text("target_type").notNull(),      // "product" | "banner"
  target_id: text("target_id").notNull(),
  kind: text("kind").notNull().default("update"),  // RevisionKind (lib/db/revisions.ts)
  payload: text("payload").notNull(),              // JSON des colonnes proposées
  origin: text("origin").notNull(),                // "mcp" | "admin_chat"
  actor_id: text("actor_id").notNull(),
  actor_name: text("actor_name").notNull(),
  summary: text("summary"),                        // une phrase, écrite par le modèle
  status: text("status").notNull().default("pending"),
  // updated_at de la cible au dépôt. Sert à refuser l'application si la cible
  // a changé depuis (voir § 2.5 du spec). Limite connue : datetime('now') a
  // une granularité à la seconde en SQLite — deux écritures dans la même
  // seconde produisent le même updated_at, donc une cible modifiée moins
  // d'une seconde après le dépôt passerait ce contrôle à tort. Acceptable
  // pour un rythme humain (administrateur) ; pas pour des appels rapprochés
  // d'un client IA. Non corrigé ici : le format du timestamp est partagé par
  // tous les chemins d'écriture existants.
  base_version: text("base_version"),
  created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
  resolved_at: text("resolved_at"),
  resolved_by: text("resolved_by"),
}, (table) => [
  index("idx_revisions_target").on(table.target_type, table.target_id),
  index("idx_revisions_status").on(table.status),
  index("idx_revisions_created").on(table.created_at),
]);
