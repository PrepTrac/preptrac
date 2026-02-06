import { describe, it, expect } from "vitest";
import { parseCSVLine, parseCSV } from "./csv";

describe("parseCSVLine", () => {
  it("parses simple unquoted fields", () => {
    expect(parseCSVLine("a,b,c")).toEqual(["a", "b", "c"]);
    expect(parseCSVLine("name,quantity,unit")).toEqual(["name", "quantity", "unit"]);
  });

  it("trims unquoted fields", () => {
    expect(parseCSVLine("  a  ,  b  ,  c  ")).toEqual(["a", "b", "c"]);
  });

  it("parses quoted fields with commas inside", () => {
    expect(parseCSVLine('"a,b",c')).toEqual(["a,b", "c"]);
    expect(parseCSVLine('name,"desc, with comma",unit')).toEqual([
      "name",
      "desc, with comma",
      "unit",
    ]);
  });

  it("parses escaped quotes as single quote", () => {
    expect(parseCSVLine('"a""b",c')).toEqual(['a"b', "c"]);
  });

  it("returns empty string for empty field", () => {
    expect(parseCSVLine("a,,c")).toEqual(["a", "", "c"]);
  });
});

describe("parseCSV", () => {
  it("returns empty array for empty or header-only content", () => {
    expect(parseCSV("")).toEqual([]);
    expect(parseCSV("   \n  ")).toEqual([]);
    expect(parseCSV("name,quantity")).toEqual([]);
  });

  it("parses header + one row", () => {
    const csv = "name,quantity,unit\nRice,20,lbs";
    expect(parseCSV(csv)).toEqual([{ name: "Rice", quantity: "20", unit: "lbs" }]);
  });

  it("parses multiple rows", () => {
    const csv = "name,quantity\nRice,20\nBeans,10";
    expect(parseCSV(csv)).toEqual([
      { name: "Rice", quantity: "20" },
      { name: "Beans", quantity: "10" },
    ]);
  });

  it("handles CRLF line endings", () => {
    const csv = "a,b\r\n1,2";
    expect(parseCSV(csv)).toEqual([{ a: "1", b: "2" }]);
  });

  it("maps columns by header name", () => {
    const csv = "category,name,unit\nFood,Rice,lbs";
    expect(parseCSV(csv)).toEqual([
      { category: "Food", name: "Rice", unit: "lbs" },
    ]);
  });

  it("fills missing values with empty string", () => {
    const csv = "a,b,c\n1,2";
    expect(parseCSV(csv)).toEqual([{ a: "1", b: "2", c: "" }]);
  });
});
