-- Make category_id nullable so draft products can be created without a category.
-- SQLite does not support ALTER COLUMN, so we recreate the table.
-- IMPORTANT: We must also backup and restore child tables that have
-- ON DELETE CASCADE references to products, since DROP TABLE triggers cascades
-- even when PRAGMA foreign_keys = OFF in some environments (e.g. Cloudflare D1).

PRAGMA foreign_keys = OFF;

-- 1. Backup all child tables that reference products(id) with ON DELETE CASCADE
CREATE TABLE _bak_product_images AS SELECT * FROM product_images;
CREATE TABLE _bak_product_variants AS SELECT * FROM product_variants;
CREATE TABLE _bak_product_attributes AS SELECT * FROM product_attributes;
CREATE TABLE _bak_reviews AS SELECT * FROM reviews;

-- 2. Recreate products table with nullable category_id
CREATE TABLE products_new (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  base_price INTEGER NOT NULL,
  compare_price INTEGER,
  sku TEXT UNIQUE,
  brand TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_featured INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  weight_grams INTEGER,
  meta_title TEXT,
  meta_description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_draft INTEGER NOT NULL DEFAULT 0
);

INSERT INTO products_new SELECT * FROM products;

DROP TABLE products;

ALTER TABLE products_new RENAME TO products;

-- 3. Recreate indexes on products (lost after DROP + RENAME)
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);

-- 4. Restore child table data if cascade-deleted
INSERT OR IGNORE INTO product_images SELECT * FROM _bak_product_images;
INSERT OR IGNORE INTO product_variants SELECT * FROM _bak_product_variants;
INSERT OR IGNORE INTO product_attributes SELECT * FROM _bak_product_attributes;
INSERT OR IGNORE INTO reviews SELECT * FROM _bak_reviews;

-- 5. Clean up backup tables
DROP TABLE _bak_product_images;
DROP TABLE _bak_product_variants;
DROP TABLE _bak_product_attributes;
DROP TABLE _bak_reviews;

PRAGMA foreign_keys = ON;
