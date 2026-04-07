/**
 * jscodeshift transform: mocha → vitest
 *
 * Handles:
 *   - require('assert') → removed, assert.X calls → expect(...) equivalents
 *   - require('chai').expect → replaced with vitest expect
 *   - assert.strictEqual / assert.equal → expect(a).toBe(b)
 *   - assert.deepEqual → expect(a).toEqual(b)
 *   - assert.ok → expect(a).toBeTruthy()
 *   - assert.throws → expect(fn).toThrow(pattern)
 *   - assert.rejects → await expect(fn).rejects.toThrow(pattern)
 *   - chai .to.equal → .toBe
 *   - chai .to.deep.equal → .toEqual
 *   - chai .to.deep.equal([]) → .toEqual([])
 *   - Adds: import { describe, it, expect, beforeEach, afterEach } from 'vitest'
 */

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let needsVitestImport = false;
  let usesExpect = false;

  // ─── 1. Remove require('assert') and require('chai') ───────────────────────

  const assertDeclarators = new Set(); // variable names bound to assert
  const chaiExpectDeclarators = new Set(); // variable names bound to chai expect

  root.find(j.VariableDeclaration).forEach((path) => {
    const declarations = path.node.declarations;
    const toRemove = [];

    declarations.forEach((decl, i) => {
      const init = decl.init;
      if (!init) return;

      // const assert = require('assert')
      if (
        init.type === "CallExpression" &&
        init.callee.name === "require" &&
        init.arguments[0]?.value === "assert" &&
        decl.id.type === "Identifier"
      ) {
        assertDeclarators.add(decl.id.name);
        toRemove.push(i);
        needsVitestImport = true;
        usesExpect = true;
      }

      // const { expect } = require('chai')
      if (
        init.type === "CallExpression" &&
        init.callee.name === "require" &&
        init.arguments[0]?.value === "chai" &&
        decl.id.type === "ObjectPattern"
      ) {
        decl.id.properties.forEach((prop) => {
          if (prop.key.name === "expect") {
            chaiExpectDeclarators.add(prop.value.name || "expect");
          }
        });
        toRemove.push(i);
        needsVitestImport = true;
        usesExpect = true;
      }
    });

    // Remove matched declarators (reverse order to preserve indices)
    toRemove
      .slice()
      .reverse()
      .forEach((i) => declarations.splice(i, 1));

    // Remove the whole declaration if nothing is left
    if (declarations.length === 0) {
      j(path).remove();
    }
  });

  // ─── 2. Convert assert.X(a, b) calls ───────────────────────────────────────

  assertDeclarators.forEach((assertName) => {
    // assert.strictEqual(a, b) / assert.equal(a, b) → expect(a).toBe(b)
    root
      .find(j.CallExpression, {
        callee: {
          type: "MemberExpression",
          object: { name: assertName },
          property: { name: (n) => n === "strictEqual" || n === "equal" },
        },
      })
      .replaceWith((path) => {
        const [actual, expected] = path.node.arguments;
        return j.callExpression(
          j.memberExpression(
            j.callExpression(j.identifier("expect"), [actual]),
            j.identifier("toBe")
          ),
          [expected]
        );
      });

    // assert.deepEqual(a, b) → expect(a).toEqual(b)
    root
      .find(j.CallExpression, {
        callee: {
          type: "MemberExpression",
          object: { name: assertName },
          property: { name: "deepEqual" },
        },
      })
      .replaceWith((path) => {
        const [actual, expected] = path.node.arguments;
        return j.callExpression(
          j.memberExpression(
            j.callExpression(j.identifier("expect"), [actual]),
            j.identifier("toEqual")
          ),
          [expected]
        );
      });

    // assert.ok(a) → expect(a).toBeTruthy()
    root
      .find(j.CallExpression, {
        callee: {
          type: "MemberExpression",
          object: { name: assertName },
          property: { name: "ok" },
        },
      })
      .replaceWith((path) => {
        const [actual] = path.node.arguments;
        return j.callExpression(
          j.memberExpression(
            j.callExpression(j.identifier("expect"), [actual]),
            j.identifier("toBeTruthy")
          ),
          []
        );
      });

    // assert.throws(fn, /pattern/) → expect(fn).toThrow(pattern)
    root
      .find(j.CallExpression, {
        callee: {
          type: "MemberExpression",
          object: { name: assertName },
          property: { name: "throws" },
        },
      })
      .replaceWith((path) => {
        const [fn, matcher] = path.node.arguments;
        const args = matcher ? [matcher] : [];
        return j.callExpression(
          j.memberExpression(
            j.callExpression(j.identifier("expect"), [fn]),
            j.identifier("toThrow")
          ),
          args
        );
      });

    // await assert.rejects(promise, /pattern/)
    // → await expect(promise).rejects.toThrow(pattern)
    root
      .find(j.CallExpression, {
        callee: {
          type: "MemberExpression",
          object: { name: assertName },
          property: { name: "rejects" },
        },
      })
      .replaceWith((path) => {
        const [fn, matcher] = path.node.arguments;
        const args = matcher ? [matcher] : [];
        return j.callExpression(
          j.memberExpression(
            j.memberExpression(
              j.callExpression(j.identifier("expect"), [fn]),
              j.identifier("rejects")
            ),
            j.identifier("toThrow")
          ),
          args
        );
      });
  });

  // ─── 3. Convert chai expect chains ─────────────────────────────────────────
  // chai:   expect(a).to.equal(b)        → expect(a).toBe(b)
  // chai:   expect(a).to.deep.equal(b)   → expect(a).toEqual(b)
  //
  // We look for CallExpressions whose callee is a MemberExpression chain
  // ending in .equal or .deep.equal, with .to somewhere in the chain.

  // Helper: flatten a member expression chain into an array of property names
  function memberChain(node) {
    const parts = [];
    let cur = node;
    while (cur.type === "MemberExpression") {
      parts.unshift(cur.property.name || cur.property.value);
      cur = cur.object;
    }
    // cur is now the root (the CallExpression or Identifier)
    return { root: cur, parts };
  }

  // expect(a).to.equal(b) / expect(a).to.be.equal(b)
  root
    .find(j.CallExpression, {
      callee: {
        type: "MemberExpression",
        property: { name: "equal" },
      },
    })
    .filter((path) => {
      const { root: r, parts } = memberChain(path.node.callee);
      return (
        r.type === "CallExpression" &&
        r.callee.name === "expect" &&
        parts.includes("to") &&
        !parts.includes("deep")
      );
    })
    .replaceWith((path) => {
      const { root: r } = memberChain(path.node.callee);
      const [expected] = path.node.arguments;
      return j.callExpression(
        j.memberExpression(r, j.identifier("toBe")),
        [expected]
      );
    });

  // expect(a).to.deep.equal(b)
  root
    .find(j.CallExpression, {
      callee: {
        type: "MemberExpression",
        property: { name: "equal" },
      },
    })
    .filter((path) => {
      const { root: r, parts } = memberChain(path.node.callee);
      return (
        r.type === "CallExpression" &&
        r.callee.name === "expect" &&
        parts.includes("to") &&
        parts.includes("deep")
      );
    })
    .replaceWith((path) => {
      const { root: r } = memberChain(path.node.callee);
      const [expected] = path.node.arguments;
      return j.callExpression(
        j.memberExpression(r, j.identifier("toEqual")),
        [expected]
      );
    });

  // ─── 4. Add vitest import ───────────────────────────────────────────────────

  if (needsVitestImport) {
    const vitestSpecifiers = [
      j.importSpecifier(j.identifier("describe")),
      j.importSpecifier(j.identifier("it")),
    ];
    if (usesExpect) vitestSpecifiers.push(j.importSpecifier(j.identifier("expect")));

    const hasBeforeEach = root.find(j.Identifier, { name: "beforeEach" }).length > 0;
    const hasAfterEach = root.find(j.Identifier, { name: "afterEach" }).length > 0;
    if (hasBeforeEach) vitestSpecifiers.push(j.importSpecifier(j.identifier("beforeEach")));
    if (hasAfterEach) vitestSpecifiers.push(j.importSpecifier(j.identifier("afterEach")));

    const vitestImport = j.importDeclaration(
      vitestSpecifiers,
      j.literal("vitest")
    );

    root.find(j.Program).get("body", 0).insertBefore(vitestImport);
  }

  return root.toSource({ quote: "double" });
};
