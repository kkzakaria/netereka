-- Fix foreign key references from old 'users' table to Better Auth 'user' table.
-- SQLite requires table recreation to change FK constraints.

PRAGMA foreign_keys = OFF;
BEGIN;

-- Recreate orders table with correct FK
CREATE TABLE IF NOT EXISTS orders_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled', 'returned')),
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  promo_code_id TEXT REFERENCES promo_codes(id),
  delivery_address TEXT NOT NULL,
  delivery_commune TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  delivery_instructions TEXT,
  estimated_delivery TEXT,
  delivered_at TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO orders_new (id, user_id, order_number, status, subtotal, delivery_fee, discount_amount, total, promo_code_id, delivery_address, delivery_commune, delivery_phone, delivery_instructions, estimated_delivery, delivered_at, cancelled_at, cancellation_reason, created_at, updated_at)
SELECT id, user_id, order_number, status, subtotal, delivery_fee, discount_amount, total, promo_code_id, delivery_address, delivery_commune, delivery_phone, delivery_instructions, estimated_delivery, delivered_at, cancelled_at, cancellation_reason, created_at, updated_at FROM orders;
DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- Recreate order_items table with correct FK
CREATE TABLE IF NOT EXISTS order_items_new (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT REFERENCES product_variants(id),
  product_name TEXT NOT NULL,
  variant_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL
);

INSERT INTO order_items_new (id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price)
SELECT id, order_id, product_id, variant_id, product_name, variant_name, quantity, unit_price, total_price FROM order_items;
DROP TABLE order_items;
ALTER TABLE order_items_new RENAME TO order_items;

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Recreate reviews table with correct FK
CREATE TABLE IF NOT EXISTS reviews_new (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_verified_purchase INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO reviews_new (id, product_id, user_id, rating, comment, is_verified_purchase, created_at)
SELECT id, product_id, user_id, rating, comment, is_verified_purchase, created_at FROM reviews;
DROP TABLE reviews;
ALTER TABLE reviews_new RENAME TO reviews;

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

-- Recreate addresses table with correct FK
CREATE TABLE IF NOT EXISTS addresses_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  label TEXT NOT NULL DEFAULT 'Domicile',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  commune TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Abidjan',
  zone_id TEXT REFERENCES delivery_zones(id),
  instructions TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO addresses_new (id, user_id, label, full_name, phone, street, commune, city, zone_id, instructions, is_default, created_at)
SELECT id, user_id, label, full_name, phone, street, commune, city, zone_id, instructions, is_default, created_at FROM addresses;
DROP TABLE addresses;
ALTER TABLE addresses_new RENAME TO addresses;

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

COMMIT;
PRAGMA foreign_keys = ON;
