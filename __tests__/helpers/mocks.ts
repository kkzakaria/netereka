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
