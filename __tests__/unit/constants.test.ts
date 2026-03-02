import { describe, it, expect } from "vitest";
import {
  ROLE_LABELS,
  ROLE_VARIANTS,
  ROLE_OPTIONS,
  STAFF_ROLE_OPTIONS,
  STAFF_ROLE_FILTER_OPTIONS,
  getUserTypeLabel,
} from "@/lib/constants/customers";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_OPTIONS,
} from "@/lib/constants/audit";

// ─── Customer constants ───

describe("ROLE_LABELS", () => {
  it("a un label pour chaque rôle", () => {
    expect(ROLE_LABELS.customer).toBe("Client");
    expect(ROLE_LABELS.agent).toBe("Agent");
    expect(ROLE_LABELS.admin).toBe("Administrateur");
    expect(ROLE_LABELS.super_admin).toBe("Super Administrateur");
  });
});

describe("ROLE_VARIANTS", () => {
  it("a un variant pour chaque rôle", () => {
    expect(ROLE_VARIANTS.customer).toBe("secondary");
    expect(ROLE_VARIANTS.agent).toBe("outline");
    expect(ROLE_VARIANTS.admin).toBe("default");
    expect(ROLE_VARIANTS.super_admin).toBe("destructive");
  });
});

describe("ROLE_OPTIONS", () => {
  it("contient les 4 rôles", () => {
    expect(ROLE_OPTIONS).toHaveLength(4);
    const values = ROLE_OPTIONS.map((o) => o.value);
    expect(values).toContain("customer");
    expect(values).toContain("agent");
    expect(values).toContain("admin");
    expect(values).toContain("super_admin");
  });

  it("chaque option a un label et une valeur", () => {
    for (const opt of ROLE_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });
});

describe("STAFF_ROLE_OPTIONS", () => {
  it("ne contient que agent, admin et super_admin", () => {
    const values = STAFF_ROLE_OPTIONS.map((o) => o.value);
    expect(values).toContain("agent");
    expect(values).toContain("admin");
    expect(values).toContain("super_admin");
    expect(values).not.toContain("customer");
  });
});

describe("STAFF_ROLE_FILTER_OPTIONS", () => {
  it("commence par l'option 'Tous'", () => {
    expect(STAFF_ROLE_FILTER_OPTIONS[0].value).toBe("all");
    expect(STAFF_ROLE_FILTER_OPTIONS[0].label).toBe("Tous");
  });

  it("inclut les rôles staff", () => {
    const values = STAFF_ROLE_FILTER_OPTIONS.map((o) => o.value);
    expect(values).toContain("agent");
    expect(values).toContain("admin");
    expect(values).toContain("super_admin");
  });
});

describe("getUserTypeLabel", () => {
  it("retourne 'client' pour customer", () => {
    expect(getUserTypeLabel("customer")).toBe("client");
  });

  it("retourne 'utilisateur' pour agent", () => {
    expect(getUserTypeLabel("agent")).toBe("utilisateur");
  });

  it("retourne 'utilisateur' pour admin", () => {
    expect(getUserTypeLabel("admin")).toBe("utilisateur");
  });

  it("retourne 'utilisateur' pour super_admin", () => {
    expect(getUserTypeLabel("super_admin")).toBe("utilisateur");
  });
});

// ─── Audit constants ───

describe("AUDIT_ACTION_LABELS", () => {
  it("a un label pour chaque action d'audit", () => {
    expect(AUDIT_ACTION_LABELS["user.created"]).toBe("Création de compte");
    expect(AUDIT_ACTION_LABELS["user.role_changed"]).toBe("Changement de rôle");
    expect(AUDIT_ACTION_LABELS["user.banned"]).toBe("Bannissement");
    expect(AUDIT_ACTION_LABELS["user.unbanned"]).toBe("Débannissement");
  });
});

describe("AUDIT_ACTION_OPTIONS", () => {
  it("commence par 'Toutes les actions'", () => {
    expect(AUDIT_ACTION_OPTIONS[0].value).toBe("all");
    expect(AUDIT_ACTION_OPTIONS[0].label).toBe("Toutes les actions");
  });

  it("contient toutes les actions d'audit", () => {
    const values = AUDIT_ACTION_OPTIONS.map((o) => o.value);
    expect(values).toContain("user.created");
    expect(values).toContain("user.role_changed");
    expect(values).toContain("user.banned");
    expect(values).toContain("user.unbanned");
  });

  it("chaque option a un label", () => {
    for (const opt of AUDIT_ACTION_OPTIONS) {
      expect(opt.label).toBeTruthy();
    }
  });
});
