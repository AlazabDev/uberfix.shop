import { describe, expect, it } from "vitest";
import { normalizePropertyRows } from "@/lib/propertyImport";
describe("property import validation", () => {
  it("keeps missing-name rows with errors", () => {
    expect(normalizePropertyRows([{ address: "القاهرة مصر" }])[0].errors.length).toBeGreaterThan(0);
  });
  it("rejects duplicates and invalid coordinates", () => {
    const rows = normalizePropertyRows([{ name: "فرع", address: "القاهرة مصر" }, { name: "فرع", address: "القاهرة مصر", latitude: "91", longitude: "30" }]);
    expect(rows[1].errors).toContain("اسم مكرر داخل الملف");
    expect(rows[1].errors.length).toBeGreaterThan(1);
  });
  it("accepts zero values, rejects fractional rooms and nonnumeric area", () => {
    expect(normalizePropertyRows([{ name: "فرع", address: "القاهرة مصر", area: "0" }])[0].errors).toEqual([]);
    expect(normalizePropertyRows([{ name: "فرع", address: "القاهرة مصر", rooms: "1.5", area: "abc" }])[0].errors.length).toBe(2);
  });
});