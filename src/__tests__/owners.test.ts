/**
 * اختبارات صارمة لنظام المالكين والأدوار
 */
import { describe, it, expect } from "vitest";
import {
  AUTHORIZED_OWNER_EMAILS,
  isAuthorizedOwner,
  isAdminRole,
  getRoleLevel,
  isHigherRole,
  getRoleLabel,
  getRoleColor,
  ROLE_HIERARCHY,
  ADMIN_ROLES,
  OPERATIONAL_ROLES,
  type AppRole,
} from "@/config/owners";

describe("Owner Authorization", () => {
  it("AUTHORIZED_OWNER_EMAILS must not be empty", () => {
    expect(AUTHORIZED_OWNER_EMAILS.length).toBeGreaterThan(0);
  });

  it("all owner emails must be lowercase", () => {
    for (const email of AUTHORIZED_OWNER_EMAILS) {
      expect(email, `Email "${email}" is not lowercase`).toBe(email.toLowerCase());
    }
  });

  it("all owner emails must be valid email format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of AUTHORIZED_OWNER_EMAILS) {
      expect(emailRegex.test(email), `"${email}" is not a valid email`).toBe(true);
    }
  });

  it("no duplicate owner emails", () => {
    const unique = new Set(AUTHORIZED_OWNER_EMAILS.map(e => e.toLowerCase()));
    expect(unique.size).toBe(AUTHORIZED_OWNER_EMAILS.length);
  });

  it("isAuthorizedOwner returns true for listed emails", () => {
    for (const email of AUTHORIZED_OWNER_EMAILS) {
      expect(isAuthorizedOwner(email)).toBe(true);
    }
  });

  it("isAuthorizedOwner is case-insensitive", () => {
    const email = AUTHORIZED_OWNER_EMAILS[0];
    expect(isAuthorizedOwner(email.toUpperCase())).toBe(true);
    expect(isAuthorizedOwner(email.charAt(0).toUpperCase() + email.slice(1))).toBe(true);
  });

  it("isAuthorizedOwner returns false for null/undefined/empty", () => {
    expect(isAuthorizedOwner(null)).toBe(false);
    expect(isAuthorizedOwner(undefined)).toBe(false);
    expect(isAuthorizedOwner('')).toBe(false);
  });

  it("isAuthorizedOwner returns false for random emails", () => {
    expect(isAuthorizedOwner('random@example.com')).toBe(false);
    expect(isAuthorizedOwner('hacker@evil.com')).toBe(false);
  });
});

describe("Role System Integrity", () => {
  const ALL_ROLES: AppRole[] = ['owner', 'admin', 'manager', 'staff', 'technician', 'vendor', 'customer', 'dispatcher', 'finance'];

  it("ROLE_HIERARCHY must contain all roles", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_HIERARCHY, `Missing role in hierarchy: ${role}`).toContain(role);
    }
  });

  it("ROLE_HIERARCHY must not have duplicates", () => {
    const unique = new Set(ROLE_HIERARCHY);
    expect(unique.size).toBe(ROLE_HIERARCHY.length);
  });

  it("owner must be highest in hierarchy", () => {
    expect(ROLE_HIERARCHY[0]).toBe('owner');
  });

  it("customer must be lowest in hierarchy", () => {
    expect(ROLE_HIERARCHY[ROLE_HIERARCHY.length - 1]).toBe('customer');
  });

  it("isAdminRole correctly identifies admin roles", () => {
    expect(isAdminRole('owner')).toBe(true);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('manager')).toBe(true);
    expect(isAdminRole('customer')).toBe(false);
    expect(isAdminRole('technician')).toBe(false);
  });

  it("ADMIN_ROLES and OPERATIONAL_ROLES must not overlap", () => {
    const overlap = ADMIN_ROLES.filter(r => OPERATIONAL_ROLES.includes(r));
    expect(overlap, "Admin and operational roles overlap").toEqual([]);
  });

  it("isHigherRole returns correct comparison", () => {
    expect(isHigherRole('owner', 'admin')).toBe(true);
    expect(isHigherRole('admin', 'customer')).toBe(true);
    expect(isHigherRole('customer', 'admin')).toBe(false);
    expect(isHigherRole('owner', 'customer')).toBe(true);
  });

  it("getRoleLevel returns increasing values down hierarchy", () => {
    let prev = -1;
    for (const role of ROLE_HIERARCHY) {
      const level = getRoleLevel(role);
      expect(level, `Role ${role} level not monotonically increasing`).toBeGreaterThan(prev);
      prev = level;
    }
  });

  it("every role must have a label", () => {
    for (const role of ALL_ROLES) {
      const label = getRoleLabel(role);
      expect(label.length, `Role ${role} has empty label`).toBeGreaterThan(0);
    }
  });

  it("every role must have a color class", () => {
    for (const role of ALL_ROLES) {
      const color = getRoleColor(role);
      expect(color.length, `Role ${role} has empty color`).toBeGreaterThan(0);
      expect(color, `Role ${role} color doesn't contain bg-`).toContain('bg-');
    }
  });
});
