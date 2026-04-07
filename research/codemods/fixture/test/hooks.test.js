import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("hooks", () => {
  let counter;

  beforeEach(() => {
    counter = 0;
  });

  afterEach(() => {
    // cleanup
    counter = null;
  });

  it("starts at zero", () => {
    expect(counter).toBe(0);
  });

  it("can be incremented", () => {
    counter++;
    expect(counter).toBe(1);
  });

  describe("nested", () => {
    let log;

    beforeEach(() => {
      log = [];
    });

    it("tracks operations", () => {
      log.push("a");
      log.push("b");
      expect(log).toEqual(["a", "b"]);
    });

    it("starts fresh each test", () => {
      expect(log).toEqual([]);
    });
  });
});
