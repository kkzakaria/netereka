-- Migration: Admin Orders Enhancement
-- Adds fields for order management: internal notes, delivery person assignment, status timestamps

-- Add new columns to orders table
ALTER TABLE orders ADD COLUMN internal_notes TEXT;
ALTER TABLE orders ADD COLUMN delivery_person_id TEXT;
ALTER TABLE orders ADD COLUMN delivery_person_name TEXT;
ALTER TABLE orders ADD COLUMN confirmed_at TEXT;
ALTER TABLE orders ADD COLUMN preparing_at TEXT;
ALTER TABLE orders ADD COLUMN shipping_at TEXT;
ALTER TABLE orders ADD COLUMN returned_at TEXT;
ALTER TABLE orders ADD COLUMN return_reason TEXT;

-- Create order status history table for audit trail
CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
