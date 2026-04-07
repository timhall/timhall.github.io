// Uses chai expect — also common
import { describe, it, expect } from "vitest"
const { capitalize, truncate, slugify } = require("../src/string.js");

describe("string", () => {
  describe("capitalize", () => {
    it("capitalizes the first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
    });

    it("handles already capitalized strings", () => {
      expect(capitalize("Hello")).toBe("Hello");
    });

    it("handles single characters", () => {
      expect(capitalize("a")).toBe("A");
    });
  });

  describe("truncate", () => {
    it("truncates long strings", () => {
      expect(truncate("hello world", 5)).toBe("hello...");
    });

    it("returns the string unchanged if short enough", () => {
      expect(truncate("hi", 10)).toBe("hi");
    });
  });

  describe("slugify", () => {
    it("converts spaces to hyphens", () => {
      expect(slugify("hello world")).toBe("hello-world");
    });

    it("lowercases the string", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("handles multiple spaces", () => {
      expect(slugify("foo  bar")).toBe("foo--bar");
    });
  });
});
