import { describe, it, expect } from "vitest";
import { adminRole, superAdminRole } from "@/lib/auth/index";

describe("role access control", () => {
  it("does not let the admin role change roles", () => {
    expect(adminRole.statements.user ?? []).not.toContain("set-role");
  });

  it("does not let the admin role set passwords, delete or impersonate users", () => {
    const userPerms = adminRole.statements.user ?? [];
    expect(userPerms).not.toContain("set-password");
    expect(userPerms).not.toContain("delete");
    expect(userPerms).not.toContain("impersonate");
  });

  it("reserves those capabilities for super_admin", () => {
    const userPerms = superAdminRole.statements.user ?? [];
    expect(userPerms).toContain("set-role");
    expect(userPerms).toContain("set-password");
  });

  it("still lets admin ban and list users", () => {
    const userPerms = adminRole.statements.user ?? [];
    expect(userPerms).toContain("list");
    expect(userPerms).toContain("ban");
  });
});
