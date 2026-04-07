// Uses chai expect — also common
const { expect } = require("chai");
const { capitalize, truncate, slugify } = require("../src/string.js");

describe("string", () => {
  describe("capitalize", () => {
    it("capitalizes the first letter", () => {
      expect(capitalize("hello")).to.equal("Hello");
    });

    it("handles already capitalized strings", () => {
      expect(capitalize("Hello")).to.equal("Hello");
    });

    it("handles single characters", () => {
      expect(capitalize("a")).to.equal("A");
    });
  });

  describe("truncate", () => {
    it("truncates long strings", () => {
      expect(truncate("hello world", 5)).to.equal("hello...");
    });

    it("returns the string unchanged if short enough", () => {
      expect(truncate("hi", 10)).to.equal("hi");
    });
  });

  describe("slugify", () => {
    it("converts spaces to hyphens", () => {
      expect(slugify("hello world")).to.equal("hello-world");
    });

    it("lowercases the string", () => {
      expect(slugify("Hello World")).to.equal("hello-world");
    });

    it("handles multiple spaces", () => {
      expect(slugify("foo  bar")).to.equal("foo--bar");
    });
  });
});
