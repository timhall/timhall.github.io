// Mix of assert and async/await patterns
const assert = require("assert");
const { fetchUser, fetchUsers } = require("../src/async.js");

describe("async", () => {
  describe("fetchUser", () => {
    it("fetches a user by id", async () => {
      const user = await fetchUser(1);
      assert.deepEqual(user, { id: 1, name: "User 1" });
    });

    it("rejects without an id", async () => {
      await assert.rejects(fetchUser(null), /id required/);
    });

    it("returns the correct id", async () => {
      const user = await fetchUser(42);
      assert.strictEqual(user.id, 42);
    });
  });

  describe("fetchUsers", () => {
    it("fetches multiple users", async () => {
      const users = await fetchUsers([1, 2, 3]);
      assert.strictEqual(users.length, 3);
      assert.deepEqual(users[0], { id: 1, name: "User 1" });
    });
  });
});
