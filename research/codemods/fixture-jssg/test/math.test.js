// Uses Node assert — common in older codebases
import { describe, it, expect } from "vitest"
const { add, subtract, divide, multiply } = require("../src/math.js");

describe("math", () => {
  describe("add", () => {
    it("adds two numbers", () => {
      expect(add(1, 2)).toBe(3);
    });

    it("handles negatives", () => {
      expect(add(-1, 1)).toBe(0);
      expect(add(-5, -3)).toBe(-8);
    });
  });

  describe("subtract", () => {
    it("subtracts two numbers", () => {
      expect(subtract(5, 3)).toBe(2);
    });
  });

  describe("divide", () => {
    it("divides two numbers", () => {
      expect(divide(10, 2)).toBe(5);
    });

    it("throws on division by zero", () => {
      expect(() => divide(1, 0)).toThrow(/Division by zero/);
    });
  });

  describe("multiply", () => {
    it("multiplies two numbers", () => {
      expect(multiply(3, 4)).toBe(12);
    });

    it("returns 0 for anything times 0", () => {
      expect(multiply(99, 0) === 0).toBeTruthy();
    });
  });
});
