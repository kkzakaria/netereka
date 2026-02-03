-- Separate customers and team members into distinct tables
-- The `user` table (better-auth) remains for authentication
-- This migration creates profile tables for each user type

-- Create team_members table for admins and super_admins
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  job_title TEXT,
  permissions TEXT, -- JSON array of permissions
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create customers table (separate from old users table)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_is_active ON team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- Migrate existing users to appropriate tables based on role
-- Customers (role = 'customer')
INSERT OR IGNORE INTO customers (id, user_id, first_name, last_name, phone, avatar_url, is_active, created_at, updated_at)
SELECT
  u.id || '_customer',
  u.id,
  COALESCE(SUBSTR(u.name, 1, INSTR(u.name || ' ', ' ') - 1), u.name),
  COALESCE(SUBSTR(u.name, INSTR(u.name || ' ', ' ') + 1), ''),
  (SELECT us.phone FROM users us WHERE us.id = u.id),
  (SELECT us.avatar_url FROM users us WHERE us.id = u.id),
  1,
  u.createdAt,
  u.updatedAt
FROM "user" u
WHERE u.role = 'customer';

-- Team members (role = 'admin' or 'super_admin')
INSERT OR IGNORE INTO team_members (id, user_id, first_name, last_name, phone, avatar_url, is_active, created_at, updated_at)
SELECT
  u.id || '_team',
  u.id,
  COALESCE(SUBSTR(u.name, 1, INSTR(u.name || ' ', ' ') - 1), u.name),
  COALESCE(SUBSTR(u.name, INSTR(u.name || ' ', ' ') + 1), ''),
  (SELECT us.phone FROM users us WHERE us.id = u.id),
  (SELECT us.avatar_url FROM users us WHERE us.id = u.id),
  1,
  u.createdAt,
  u.updatedAt
FROM "user" u
WHERE u.role IN ('admin', 'super_admin');
