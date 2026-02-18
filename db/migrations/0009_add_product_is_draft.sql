-- Add is_draft column to products table
-- Enables auto-creating draft products for immediate image/variant uploads during creation
ALTER TABLE products ADD COLUMN is_draft INTEGER NOT NULL DEFAULT 0;
