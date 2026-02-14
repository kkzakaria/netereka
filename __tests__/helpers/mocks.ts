/**
 * Shared mock session data for tests.
 */
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

/**
 * Custom error class to simulate Next.js redirect behavior.
 */
export class RedirectError extends Error {
  public readonly digest: string;
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT: ${url}`);
    this.digest = `NEXT_REDIRECT;${url}`;
  }
}
