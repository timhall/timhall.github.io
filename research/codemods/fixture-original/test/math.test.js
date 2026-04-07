// Uses Node assert — common in older codebases
const assert = require("assert");
const { add, subtract, divide, multiply } = require("../src/math.js");

describe("math", () => {
  describe("add", () => {
    it("adds two numbers", () => {
      assert.strictEqual(add(1, 2), 3);
    });

    it("handles negatives", () => {
      assert.strictEqual(add(-1, 1), 0);
      assert.strictEqual(add(-5, -3), -8);
    });
  });

  describe("subtract", () => {
    it("subtracts two numbers", () => {
      assert.strictEqual(subtract(5, 3), 2);
    });
  });

  describe("divide", () => {
    it("divides two numbers", () => {
      assert.strictEqual(divide(10, 2), 5);
    });

    it("throws on division by zero", () => {
      assert.throws(() => divide(1, 0), /Division by zero/);
    });
  });

  describe("multiply", () => {
    it("multiplies two numbers", () => {
      assert.strictEqual(multiply(3, 4), 12);
    });

    it("returns 0 for anything times 0", () => {
      assert.ok(multiply(99, 0) === 0);
    });
  });
});
