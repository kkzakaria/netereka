import { describe, it, expect } from "vitest";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_OPTIONS,
} from "@/lib/constants/audit";
import type { AuditAction } from "@/lib/db/types";

const ALL_ACTIONS: AuditAction[] = [
  "user.role_changed",
  "user.activated",
  "user.deactivated",
];

describe("AUDIT_ACTION_LABELS", () => {
  it("a un label pour chaque action", () => {
    for (const action of ALL_ACTIONS) {
      expect(AUDIT_ACTION_LABELS[action]).toBeDefined();
      expect(typeof AUDIT_ACTION_LABELS[action]).toBe("string");
    }
  });

  it("les labels sont en français", () => {
    expect(AUDIT_ACTION_LABELS["user.role_changed"]).toBe("Changement de rôle");
    expect(AUDIT_ACTION_LABELS["user.activated"]).toBe("Activation de compte");
    expect(AUDIT_ACTION_LABELS["user.deactivated"]).toBe("Désactivation de compte");
  });
});

describe("AUDIT_ACTION_OPTIONS", () => {
  it("commence par l'option 'Toutes les actions'", () => {
    expect(AUDIT_ACTION_OPTIONS[0]).toEqual({
      value: "all",
      label: "Toutes les actions",
    });
  });

  it("contient une option par action plus le filtre 'all'", () => {
    expect(AUDIT_ACTION_OPTIONS).toHaveLength(ALL_ACTIONS.length + 1);
  });

  it("les labels des options correspondent à AUDIT_ACTION_LABELS", () => {
    // Skip the first "all" option
    for (const option of AUDIT_ACTION_OPTIONS.slice(1)) {
      expect(option.label).toBe(
        AUDIT_ACTION_LABELS[option.value as AuditAction]
      );
    }
  });

  it("chaque option a value et label", () => {
    for (const option of AUDIT_ACTION_OPTIONS) {
      expect(option.value).toBeDefined();
      expect(option.label).toBeDefined();
      expect(typeof option.value).toBe("string");
      expect(typeof option.label).toBe("string");
    }
  });
});
