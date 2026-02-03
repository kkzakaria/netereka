-- Add is_active column to users table for customer management
ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

-- Create index for filtering by active status
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
