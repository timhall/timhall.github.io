// Exercises beforeEach/afterEach lifecycle hooks
const { expect } = require("chai");

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
    expect(counter).to.equal(0);
  });

  it("can be incremented", () => {
    counter++;
    expect(counter).to.equal(1);
  });

  describe("nested", () => {
    let log;

    beforeEach(() => {
      log = [];
    });

    it("tracks operations", () => {
      log.push("a");
      log.push("b");
      expect(log).to.deep.equal(["a", "b"]);
    });

    it("starts fresh each test", () => {
      expect(log).to.deep.equal([]);
    });
  });
});
