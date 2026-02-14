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
