-- Better Auth migration
-- Creates Better Auth tables alongside existing 'users' table.
-- The 'users' table is intentionally kept (not dropped) because it has
-- foreign key references from orders, addresses, and reviews tables.
-- Better Auth operates on the new 'user' table exclusively.

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'super_admin')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  expiresAt TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  password TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for Better Auth tables
CREATE INDEX IF NOT EXISTS idx_session_userId ON "session"(userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON "session"(token);
CREATE INDEX IF NOT EXISTS idx_account_userId ON "account"(userId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_provider ON "account"(providerId, accountId);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);

-- Migrate existing users data
INSERT OR IGNORE INTO "user" (id, name, email, emailVerified, image, phone, role, createdAt, updatedAt)
SELECT
  id,
  first_name || ' ' || last_name,
  email,
  is_verified,
  avatar_url,
  phone,
  role,
  created_at,
  updated_at
FROM users;

-- Migrate email/password accounts
INSERT OR IGNORE INTO "account" (id, accountId, providerId, userId, password, createdAt, updatedAt)
SELECT
  id || '_email',
  id,
  'credential',
  id,
  password_hash,
  created_at,
  updated_at
FROM users
WHERE password_hash IS NOT NULL;

-- Migrate OAuth accounts
INSERT OR IGNORE INTO "account" (id, accountId, providerId, userId, createdAt, updatedAt)
SELECT
  id || '_oauth',
  id,
  auth_provider,
  id,
  created_at,
  updated_at
FROM users
WHERE auth_provider != 'email' AND password_hash IS NULL;
