import { describe, it, expect } from "vitest";
const { fetchUser, fetchUsers } = require("../src/async.js");

describe("async", () => {
  describe("fetchUser", () => {
    it("fetches a user by id", async () => {
      const user = await fetchUser(1);
      expect(user).toEqual({ id: 1, name: "User 1" });
    });

    it("rejects without an id", async () => {
      await expect(fetchUser(null)).rejects.toThrow(/id required/);
    });

    it("returns the correct id", async () => {
      const user = await fetchUser(42);
      expect(user.id).toBe(42);
    });
  });

  describe("fetchUsers", () => {
    it("fetches multiple users", async () => {
      const users = await fetchUsers([1, 2, 3]);
      expect(users.length).toBe(3);
      expect(users[0]).toEqual({ id: 1, name: "User 1" });
    });
  });
});
