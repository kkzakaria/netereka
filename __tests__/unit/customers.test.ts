import { describe, it, expect } from "vitest";
import {
  ROLE_LABELS,
  ROLE_VARIANTS,
  ROLE_OPTIONS,
  ADMIN_ROLE_OPTIONS,
  ADMIN_ROLE_FILTER_OPTIONS,
  getUserTypeLabel,
} from "@/lib/constants/customers";
import type { UserRole } from "@/lib/db/types";

const ALL_ROLES: UserRole[] = ["customer", "admin", "super_admin"];

describe("ROLE_LABELS", () => {
  it("a un label pour chaque rôle", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe("string");
    }
  });

  it("les labels sont en français", () => {
    expect(ROLE_LABELS.customer).toBe("Client");
    expect(ROLE_LABELS.admin).toBe("Administrateur");
    expect(ROLE_LABELS.super_admin).toBe("Super Administrateur");
  });
});

describe("ROLE_VARIANTS", () => {
  it("a un variant pour chaque rôle", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_VARIANTS[role]).toBeDefined();
    }
  });

  it("utilise des variants badge valides", () => {
    const validVariants = ["default", "secondary", "destructive", "outline"];
    for (const role of ALL_ROLES) {
      expect(validVariants).toContain(ROLE_VARIANTS[role]);
    }
  });
});

describe("ROLE_OPTIONS", () => {
  it("contient les 3 rôles", () => {
    expect(ROLE_OPTIONS).toHaveLength(3);
  });

  it("chaque option a value et label", () => {
    for (const option of ROLE_OPTIONS) {
      expect(option.value).toBeDefined();
      expect(option.label).toBeDefined();
    }
  });

  it("les labels correspondent à ROLE_LABELS", () => {
    for (const option of ROLE_OPTIONS) {
      expect(option.label).toBe(ROLE_LABELS[option.value]);
    }
  });
});

describe("ADMIN_ROLE_OPTIONS", () => {
  it("contient uniquement admin et super_admin", () => {
    expect(ADMIN_ROLE_OPTIONS).toHaveLength(2);
    const values = ADMIN_ROLE_OPTIONS.map((o) => o.value);
    expect(values).toContain("admin");
    expect(values).toContain("super_admin");
    expect(values).not.toContain("customer");
  });
});

describe("ADMIN_ROLE_FILTER_OPTIONS", () => {
  it("commence par l'option 'Tous'", () => {
    expect(ADMIN_ROLE_FILTER_OPTIONS[0]).toEqual({
      value: "all",
      label: "Tous",
    });
  });

  it("inclut les rôles admin après 'Tous'", () => {
    expect(ADMIN_ROLE_FILTER_OPTIONS).toHaveLength(3);
  });
});

describe("getUserTypeLabel", () => {
  it("retourne 'client' pour customer", () => {
    expect(getUserTypeLabel("customer")).toBe("client");
  });

  it("retourne 'utilisateur' pour admin", () => {
    expect(getUserTypeLabel("admin")).toBe("utilisateur");
  });

  it("retourne 'utilisateur' pour super_admin", () => {
    expect(getUserTypeLabel("super_admin")).toBe("utilisateur");
  });
});
