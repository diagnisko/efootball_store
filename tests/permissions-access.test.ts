import test from "node:test";
import assert from "node:assert/strict";
import { canAccessBackofficeSection } from "../lib/permissions";

test("super admin can access every backoffice section", () => {
  assert.equal(canAccessBackofficeSection("SUPER_ADMIN", "admin-1", "/admin/dashboard"), true);
  assert.equal(canAccessBackofficeSection("SUPER_ADMIN", "admin-1", "/admin/clients"), true);
});

test("manager requires explicit capability for admin sections", () => {
  assert.equal(canAccessBackofficeSection("MANAGER", "manager-1", "/admin/clients", { view_clients: true }), true);
  assert.equal(canAccessBackofficeSection("MANAGER", "manager-1", "/admin/products", { view_clients: true }), false);
  assert.equal(canAccessBackofficeSection("MANAGER", "manager-1", "/admin/products", { manage_offers: true }), true);
});
