-- Make category_id nullable so draft products can be created without a category.
-- SQLite does not support ALTER COLUMN, so we recreate the table.

PRAGMA foreign_keys = OFF;

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

PRAGMA foreign_keys = ON;
