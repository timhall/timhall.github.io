/**
 * jssg transform: mocha → vitest
 *
 * Uses ast-grep structural pattern matching to find and replace assertion
 * patterns. Handles:
 *   - require('assert') + require('chai') → vitest import
 *   - assert.strictEqual/equal → expect().toBe()
 *   - assert.deepEqual → expect().toEqual()
 *   - assert.ok → expect().toBeTruthy()
 *   - assert.throws → expect().toThrow()
 *   - assert.rejects → expect().rejects.toThrow()
 *   - chai .to.equal → .toBe()
 *   - chai .to.deep.equal → .toEqual()
 */

// @ts-ignore virtual module resolved by codemod CLI
import type { Transform } from "codemod:ast-grep";

const transform: Transform = (root) => {
  const n = root.root();
  const edits = [];

  // ─── Determine vitest import specifiers ──────────────────────────────────

  const specifiers = ["describe", "it", "expect"];
  if (n.findAll({ rule: { pattern: "beforeEach($$$ARGS)" } }).length > 0)
    specifiers.push("beforeEach");
  if (n.findAll({ rule: { pattern: "afterEach($$$ARGS)" } }).length > 0)
    specifiers.push("afterEach");
  const vitestImport = `import { ${specifiers.join(", ")} } from "vitest";`;

  // ─── Remove assert / chai requires ───────────────────────────────────────

  const assertRequires = n.findAll({
    rule: { pattern: `const assert = require("assert")` },
  });
  const chaiRequires = n.findAll({
    rule: { pattern: `const { expect } = require("chai")` },
  });
  const libRequires = [...assertRequires, ...chaiRequires];

  if (libRequires.length === 0) return null;

  // Replace the first lib require with the vitest import; delete any extras
  edits.push(libRequires[0].replace(vitestImport));
  for (let i = 1; i < libRequires.length; i++) {
    edits.push(libRequires[i].replace(""));
  }

  // ─── assert.strictEqual / assert.equal → expect(a).toBe(b) ──────────────

  n.findAll({
    rule: {
      any: [
        { pattern: "assert.strictEqual($A, $B)" },
        { pattern: "assert.equal($A, $B)" },
      ],
    },
  }).forEach((node) => {
    const a = node.getMatch("A").text();
    const b = node.getMatch("B").text();
    edits.push(node.replace(`expect(${a}).toBe(${b})`));
  });

  // ─── assert.deepEqual → expect(a).toEqual(b) ─────────────────────────────

  n.findAll({ rule: { pattern: "assert.deepEqual($A, $B)" } }).forEach(
    (node) => {
      const a = node.getMatch("A").text();
      const b = node.getMatch("B").text();
      edits.push(node.replace(`expect(${a}).toEqual(${b})`));
    }
  );

  // ─── assert.ok → expect(a).toBeTruthy() ──────────────────────────────────

  n.findAll({ rule: { pattern: "assert.ok($A)" } }).forEach((node) => {
    const a = node.getMatch("A").text();
    edits.push(node.replace(`expect(${a}).toBeTruthy()`));
  });

  // ─── assert.throws → expect(fn).toThrow(pattern) ─────────────────────────

  n.findAll({ rule: { pattern: "assert.throws($A, $B)" } }).forEach((node) => {
    const a = node.getMatch("A").text();
    const b = node.getMatch("B").text();
    edits.push(node.replace(`expect(${a}).toThrow(${b})`));
  });

  // ─── assert.rejects → expect(promise).rejects.toThrow(pattern) ───────────
  // The surrounding `await` is preserved because we only replace the
  // CallExpression, not the AwaitExpression wrapping it.

  n.findAll({ rule: { pattern: "assert.rejects($A, $B)" } }).forEach((node) => {
    const a = node.getMatch("A").text();
    const b = node.getMatch("B").text();
    edits.push(node.replace(`expect(${a}).rejects.toThrow(${b})`));
  });

  // ─── chai: expect(a).to.equal(b) → expect(a).toBe(b) ────────────────────

  n.findAll({ rule: { pattern: "expect($A).to.equal($B)" } }).forEach(
    (node) => {
      const a = node.getMatch("A").text();
      const b = node.getMatch("B").text();
      edits.push(node.replace(`expect(${a}).toBe(${b})`));
    }
  );

  // ─── chai: expect(a).to.deep.equal(b) → expect(a).toEqual(b) ────────────

  n.findAll({ rule: { pattern: "expect($A).to.deep.equal($B)" } }).forEach(
    (node) => {
      const a = node.getMatch("A").text();
      const b = node.getMatch("B").text();
      edits.push(node.replace(`expect(${a}).toEqual(${b})`));
    }
  );

  return n.commitEdits(edits);
};

export default transform;
