---
title: "Codemods in the AI Era"
slug: codemods-ai-era
publishedAt: null
---

Codemods — programmatic transformations of source code — have long been the tool of choice for large-scale migrations: renaming APIs, upgrading frameworks, enforcing new patterns across thousands of files. Now that LLMs can write code fluently, the question is: can AI write codemods for us, or even *be* the codemod?

The answer is nuanced, and the friction you hit quickly reveals something deeper about how LLMs understand code.

---

## The scenario

One-off codemods on large codebases. You want to migrate from mocha to vitest, upgrade a React version, or swap an HTTP library. You'll run this once and throw it away. The process should be repeatable (you can inspect and rerun as you refine), and efficient (not a token-burning exercise).

Two approaches worth comparing:

1. **LLM as codemod** — give an AI assistant the migration task and let it read and rewrite files directly
2. **Iterative AST transform** — write a jscodeshift transform, run it, inspect the diff, fix edge cases, repeat

---

## Approach 1: LLM as codemod

The simplest version: open Claude Code (or Cursor, or a script hitting the Anthropic API) and say something like:

> "Migrate all files in `test/` from mocha to vitest. Replace `require('assert')` and `require('chai')` with vitest's `expect`. Convert all assertions to vitest equivalents. Add vitest imports."

The LLM reads each file, understands the context holistically, and rewrites it. No tooling to install, no API to learn. It handles comments, unusual patterns, and mixed styles gracefully.

**Where it works well:**

- Small codebases or small sets of files (under ~30 files)
- Heterogeneous code where each file needs slightly different treatment
- Migrations involving judgment calls (renaming variables, restructuring async patterns)
- When you genuinely don't know all the patterns upfront

**Where it breaks down:**

- Token cost scales linearly with file count. At ~1,500 tokens per file (input + output), 200 test files costs ~300k tokens — around $1–2 at current pricing, but more importantly it's *slow* (many sequential API calls) and non-deterministic
- Each file is an independent LLM call. You can't easily verify completeness — did it miss files? Did it make different choices on similar patterns?
- Large files can exceed context. The LLM sees the full file as text, not as structure
- Subtle semantic bugs are hard to catch. The LLM writes confident, plausible-looking code that may silently change behavior in edge cases

The LLM approach is best when the migration is conceptually complex but the codebase is small — when you want judgment, not scale.

---

## Approach 2: Iterative AST transform

Write a jscodeshift transform. Run it. Look at the diff. Fix what's wrong. Run again.

This is the approach tools like jscodeshift were designed for, and the iteration loop is the key insight: you don't have to write a perfect transform upfront. You write something that handles 80% of cases, inspect the output, then extend it.

### The transform

For a mocha→vitest migration, the key operations are:

```js
// 1. Remove assert/chai requires, replace with vitest import
// 2. Convert assert.strictEqual(a, b) → expect(a).toBe(b)
// 3. Convert assert.deepEqual(a, b)   → expect(a).toEqual(b)
// 4. Convert assert.throws(fn, /p/)   → expect(fn).toThrow(/p/)
// 5. Convert assert.rejects(p, /p/)   → expect(p).rejects.toThrow(/p/)
// 6. Convert chai .to.equal(b)        → .toBe(b)
// 7. Convert chai .to.deep.equal(b)   → .toEqual(b)
// 8. Add: import { describe, it, expect, beforeEach, afterEach } from 'vitest'
```

The jscodeshift API is built around finding AST nodes by type and replacing them:

```js
// assert.strictEqual(a, b) → expect(a).toBe(b)
root
  .find(j.CallExpression, {
    callee: {
      type: "MemberExpression",
      object: { name: "assert" },
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
```

### Running it

```sh
npx jscodeshift -t mocha-to-vitest.js test/ --parser=babel
```

Output on 4 test files:

```
Processing 4 files...
Results: 0 errors  0 unmodified  0 skipped  4 ok
Time elapsed: 0.674 seconds
```

### First-pass results

The transform correctly handled the core patterns across all 4 files:

```diff
-const assert = require("assert");
+import { describe, it, expect } from "vitest";

-assert.strictEqual(add(1, 2), 3);
+expect(add(1, 2)).toBe(3);

-assert.deepEqual(user, { id: 1, name: "User 1" });
+expect(user).toEqual({ id: 1, name: "User 1" });

-await assert.rejects(fetchUser(null), /id required/);
+await expect(fetchUser(null)).rejects.toThrow(/id required/);

-expect(capitalize("hello")).to.equal("Hello");   // chai
+expect(capitalize("hello")).toBe("Hello");        // vitest

-expect(log).to.deep.equal(["a", "b"]);
+expect(log).toEqual(["a", "b"]);
```

### First-pass issues (what the iteration is for)

Two things to fix in pass 2:

**1. Expressions wrapped in `assert.ok` don't get unwrapped**

```js
// Input:
assert.ok(multiply(99, 0) === 0);

// Output (pass 1):
expect(multiply(99, 0) === 0).toBeTruthy();

// Better (pass 2):
expect(multiply(99, 0)).toBe(0);
```

The transform mechanically converts `assert.ok(expr)` → `expect(expr).toBeTruthy()`, which preserves behavior but doesn't understand that the original expression was a comparison. Fixing this requires recognizing that `assert.ok(a === b)` can be rewritten as `expect(a).toBe(b)` — a semantic, not just syntactic, transformation.

**2. Leading comments on removed nodes are dropped**

```js
// Input:
// Mix of assert and async/await patterns
const assert = require("assert");

// Output: the comment is gone
import { describe, it, expect } from "vitest";
```

jscodeshift attaches comments to AST nodes as `leadingComments`. When you remove the node, the comment goes with it. Fixing this requires either preserving the comment explicitly or accepting the loss.

Both are fixable in a second pass — but this is the point: the iteration is how you discover and address these edge cases systematically, with a clear diff showing what changed each time.

---

## Comparing the two approaches

| | LLM as codemod | Iterative AST transform |
|---|---|---|
| Setup time | Minutes | 30–90 min to write the initial transform |
| First-pass accuracy | High for common patterns; variable for edge cases | ~80–90% of targeted patterns; predictable gaps |
| Handles unusual patterns | Yes — uses judgment | Only what you explicitly encode |
| Deterministic | No — different runs may produce different output | Yes — same output every time |
| Scalable | Linearly expensive; slow for 100+ files | Runs in seconds regardless of codebase size |
| Verifiable | Hard — must read each diff manually | Run with `--dry`, review unified diff |
| Iteratable | Re-running reruns everything | Re-running only processes unmodified files |
| Comments/formatting | Usually preserved with care | Fragile — node deletion drops attached comments |

### The token math

For 200 test files at ~1,500 tokens per file: the LLM approach costs ~300k tokens per run. With 2–3 refinement iterations, you're at nearly 1M tokens. The jscodeshift approach: write the transform once (maybe with LLM assistance, at ~10k tokens total), run it in under a second, iterate on the transform itself — not the codebase.

---

## Recommendation

For one-off codemods on a large codebase: **iterative AST transform**.

The upfront cost of learning the jscodeshift API is real, but it pays off quickly. The LLM approach's apparent ease is offset by the cost of verification — since the output is non-deterministic and each file is independent, you either trust it blindly or review every diff anyway.

The practical workflow:

1. **Use an LLM to write the initial transform.** This is where LLMs genuinely help — generating jscodeshift boilerplate from a description. Expect ~3 iterations to get the first pass working (jscodeshift API hallucinations are common; the LLM will need corrective feedback from compiler/runtime errors).

2. **Run with `--dry` first**, which prints a diff without writing files. Review the representative sample.

3. **Iterate on the transform**, not the files. Each refinement pass is free — you're running a 0.6s script, not calling an API.

4. **Accept imperfection.** A transform that handles 90% of cases correctly and leaves 10% untouched (jscodeshift marks them as `unmodified`) is often good enough. Find the residuals with grep and handle them manually or in a follow-up pass.

5. **Check in the transform.** It's documentation of what you changed. Six months later when you wonder "why does this file look different from the others," you have an answer.

### When to use the LLM approach instead

- The codebase has under 20–30 files to touch
- The patterns are genuinely heterogeneous (each file needs different judgment)
- You can't articulate the transformation rules precisely enough to encode in a transform
- The migration involves semantic restructuring that's hard to express as AST operations

---

## The deeper tension

The core issue is that LLMs operate on text tokens, while codemods require structural understanding. A jscodeshift transform knows that `assert.strictEqual` is a CallExpression with a MemberExpression callee — it can't accidentally match a string literal that contains those words. An LLM doesn't have that guarantee.

This shows up in a practical problem: LLMs commonly hallucinate jscodeshift's API. jscodeshift collections are typed (you can't call FunctionExpression methods on an Identifier collection), visitor patterns are specific, and there's limited training signal. The first few LLM-generated transforms typically need runtime-error feedback before they work.

The hybrid that works best: use the LLM to get you to a working transform faster (prompt → jscodeshift code → run → error → feed back to LLM → fix), then rely on the deterministic transform for the actual codebase migration.

---

*Research files: `research/codemods/` — fixture codebase and jscodeshift transform*
