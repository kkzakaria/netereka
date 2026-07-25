// ─── Session fixtures ───

export const mockCustomerSession = {
  user: {
    id: "user-1",
    name: "Koné Amadou",
    email: "kone@example.com",
    role: "customer",
    phone: "0102030405",
  },
  session: { id: "sess-1", expiresAt: new Date("2099-01-01") },
};

export const mockAdminSession = {
  user: {
    id: "admin-1",
    name: "Admin User",
    email: "admin@netereka.ci",
    role: "admin",
    phone: "0708091011",
  },
  session: { id: "sess-2", expiresAt: new Date("2099-01-01") },
};

export const mockSuperAdminSession = {
  user: {
    id: "super-1",
    name: "Super Admin",
    email: "super@netereka.ci",
    role: "super_admin",
    phone: "0506070809",
  },
  session: { id: "sess-3", expiresAt: new Date("2099-01-01") },
};

export const mockAgentSession = {
  user: {
    id: "agent-1",
    name: "Agent User",
    email: "agent@netereka.ci",
    role: "agent",
    phone: "0102030405",
  },
  session: { id: "sess-4", expiresAt: new Date("2099-01-01") },
};

// better-auth's admin plugin only auto-clears an expired ban at session
// *creation* (sign-in) — an existing session's cached/fresh read can still
// carry banned: true past banExpires. These fixtures exercise both cases:
// an active ban (no expiry, or expiry in the future) and one that has
// already lapsed but was never re-signed-in.
export const mockBannedAdminSession = {
  user: {
    id: "admin-2",
    name: "Banned Admin",
    email: "banned-admin@netereka.ci",
    role: "admin",
    phone: "0708091012",
    banned: true,
    banExpires: null,
  },
  session: { id: "sess-5", expiresAt: new Date("2099-01-01") },
};

export const mockExpiredBanAdminSession = {
  user: {
    id: "admin-3",
    name: "Formerly Banned Admin",
    email: "formerly-banned-admin@netereka.ci",
    role: "admin",
    phone: "0708091013",
    banned: true,
    banExpires: new Date("2020-01-01"),
  },
  session: { id: "sess-6", expiresAt: new Date("2099-01-01") },
};

// Same rationale as the admin fixtures above, for the storefront guard
// (requireAuth), which reads the cached cookie payload rather than a fresh
// D1 row — see lib/auth/guards.ts for why that cached payload still carries
// banned/banExpires.
export const mockBannedCustomerSession = {
  user: {
    id: "user-2",
    name: "Banned Customer",
    email: "banned-customer@example.com",
    role: "customer",
    phone: "0102030406",
    banned: true,
    banExpires: null,
  },
  session: { id: "sess-7", expiresAt: new Date("2099-01-01") },
};

export const mockExpiredBanCustomerSession = {
  user: {
    id: "user-3",
    name: "Formerly Banned Customer",
    email: "formerly-banned-customer@example.com",
    role: "customer",
    phone: "0102030407",
    banned: true,
    banExpires: new Date("2020-01-01"),
  },
  session: { id: "sess-8", expiresAt: new Date("2099-01-01") },
};

// requireAuth's normal (cache-hit) read never sees the shape above. better-auth's
// cache branch (session.mjs) only re-hydrates createdAt/updatedAt into Date
// objects when reading the cookie payload back out of JSON — banExpires comes
// through as whatever JSON.parse produced, i.e. an ISO string (or null), not a
// Date. A privileged guard's fresh D1 read gets a real Date instead (the D1
// Kysely adapter's output transform converts stored date columns back to Date
// for dialects with supportsDates: false, which sqlite/D1 is). This fixture
// pins the string shape so requireAuth is tested at the shape it actually
// receives on its hot path, not just the shape the privileged guards receive.
export const mockExpiredBanCustomerSessionFromCache = {
  user: {
    id: "user-4",
    name: "Formerly Banned Customer (cache shape)",
    email: "formerly-banned-customer-cache@example.com",
    role: "customer",
    phone: "0102030408",
    banned: true,
    banExpires: "2020-01-01T00:00:00.000Z",
  },
  session: { id: "sess-9", expiresAt: new Date("2099-01-01") },
};
