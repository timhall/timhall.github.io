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
2. **Iterative AST transform** — write a transform, run it, inspect the diff, fix edge cases, repeat

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

Write a transform. Run it. Look at the diff. Fix what's wrong. Run again.

The iteration loop is the key insight: you don't have to write a perfect transform upfront. You write something that handles 80% of cases, inspect the output, then extend it.

Two tools are worth examining here. jscodeshift is the established option and has the most LLM training data. jssg (from codemod.com) is newer, built on ast-grep's pattern syntax, and is the direction the field is heading.

---

### jscodeshift

jscodeshift's API is built around finding AST nodes by type and replacing them:

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

You're constructing AST nodes directly — verbose but explicit.

```sh
npx jscodeshift -t mocha-to-vitest.js test/ --parser=babel
```

```
Processing 4 files...
Results: 0 errors  0 unmodified  0 skipped  4 ok
Time elapsed: 0.674 seconds
```

Clear output: file count, error count, timing. `--dry` prints a diff without writing.

**First-pass issues discovered via diff:**

1. Leading comments attached to removed nodes are silently dropped:

```diff
-// Mix of assert and async/await patterns
-const assert = require("assert");
+import { describe, it, expect } from "vitest";
```

jscodeshift attaches comments to AST nodes as `leadingComments`. When you remove the node, the comment goes with it. Fixable, but a gotcha.

2. `assert.ok(expr === value)` converts mechanically:

```js
// in: assert.ok(multiply(99, 0) === 0)
// out: expect(multiply(99, 0) === 0).toBeTruthy()   ← works, not idiomatic
// better: expect(multiply(99, 0)).toBe(0)
```

Fixing this requires semantic understanding of the wrapped expression — a second-pass improvement.

---

### jssg

jssg uses [ast-grep](https://ast-grep.github.io/) structural patterns instead of explicit node construction. The same transform reads considerably more directly:

```ts
import type { Transform } from "codemod:ast-grep";

const transform: Transform = (root) => {
  const n = root.root();
  const edits = [];

  // assert.strictEqual(a, b) / assert.equal(a, b) → expect(a).toBe(b)
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

  return n.commitEdits(edits);
};
```

The pattern syntax is close to the code itself. `$A` and `$B` capture subexpressions structurally — no need to know the AST node type names or navigate the type hierarchy manually.

**Running it requires a two-step workflow:**

```sh
# Step 1: bundle the TypeScript transform
npx codemod jssg bundle mocha-to-vitest.ts --output mocha-to-vitest.bundle.js

# Step 2: run with absolute path (relative paths fail silently or error)
npx codemod jssg run /abs/path/to/mocha-to-vitest.bundle.js \
  --target /abs/path/to/test/ \
  --language js
```

The bundle step is required even for simple transforms — the CLI doesn't resolve `.ts` files directly at runtime. The absolute path requirement is a rough edge: relative paths either fail with a module resolution error or run silently as a no-op.

Dry-run works and produces a readable diff:

```sh
npx codemod jssg run ... --dry-run
```

**jssg output vs jscodeshift:**

jssg's replacements are surgical text edits, not node replacements. This means leading comments are preserved:

```diff
 // Mix of assert and async/await patterns
-const assert = require("assert");
+import { describe, it, expect } from "vitest";
```

The comment survives because the pattern `const assert = require("assert")` only matches that statement — the preceding comment line is a separate entity that jssg doesn't touch.

The same semantic limitation applies: `assert.ok(expr === value)` still becomes `expect(expr === value).toBeTruthy()` in the first pass.

---

## Comparing the two approaches

| | LLM as codemod | jscodeshift | jssg |
|---|---|---|---|
| Setup time | Minutes | 30–90 min | 30–90 min |
| First-pass accuracy | High; variable on edge cases | ~80–90%; predictable gaps | ~80–90%; predictable gaps |
| Handles unusual patterns | Yes | Only what you encode | Only what you encode |
| Deterministic | No | Yes | Yes |
| Scalable | Linearly expensive | Seconds regardless of size | Seconds regardless of size |
| Verifiable | Hard | `--dry` unified diff | `--dry-run` colored diff |
| Pattern authoring | Natural language | AST node construction | Code-like patterns |
| Comment preservation | Usually | Fragile — drops on removal | Surgical — preserves adjacent |
| LLM hallucination risk | N/A | High — complex API | Lower — simpler pattern syntax |
| CLI friction | None | Low | Medium — bundle step + absolute paths |

### The token math

For 200 test files at ~1,500 tokens per file: the LLM approach costs ~300k tokens per run. With 2–3 refinement iterations, you're near 1M tokens. The AST transform approach: write the transform once (maybe with LLM help, ~10k tokens), run it in under a second, iterate on the transform itself — not the codebase.

---

## Recommendation

For one-off codemods on a large codebase: **iterative AST transform**, and between the two tools, **jssg is the better choice going forward** — the pattern syntax is simpler, LLMs write it more reliably, and comment preservation is better by default.

The upfront cost is the same (you still need to understand what you're matching), but the patterns look like the code you're transforming rather than an AST construction API.

The practical workflow:

1. **Use an LLM to write the initial transform.** Describe the migration in plain terms and ask for a jssg transform. The code-like pattern syntax reduces hallucination significantly vs jscodeshift. Still expect 2–3 iterations to get it running.

2. **Run with `--dry-run` first.** Review the diff on a representative sample before writing.

3. **Iterate on the transform**, not the files. Each pass is free — you're running a sub-second script.

4. **Accept imperfection.** A transform that handles 90% of cases correctly and leaves 10% untouched is usually good enough. Grep for residuals and handle manually.

5. **Check in the transform.** It documents what changed and why. A git-committed `mocha-to-vitest.ts` is much more honest than a vague commit message.

### When to use the LLM approach instead

- Under ~20–30 files to touch
- Patterns are genuinely heterogeneous (each file needs different judgment)
- You can't articulate the transformation rules precisely enough to encode
- The migration involves semantic restructuring that's hard to express as pattern matching

---

## The deeper tension

The core issue is that LLMs operate on text tokens, while codemods require structural understanding. The pattern `assert.strictEqual($A, $B)` in ast-grep matches the call expression structurally — it can't accidentally match a string literal that contains those words. An LLM operating on text doesn't have that guarantee.

This shows up in a practical problem: LLMs commonly hallucinate jscodeshift's API. The API is complex (typed collections, visitor patterns, AST builder methods), and there's limited training signal for the specific error modes. The simpler pattern syntax of jssg reduces but doesn't eliminate this — the LLM still needs to understand which patterns match which syntax, and `commitEdits` vs node mutation is a new concept.

The hybrid that works best: use the LLM to get you to a working transform faster (describe the migration → get transform code → run → error → feed back → fix), then rely on the deterministic transform for the actual codebase. The LLM accelerates the authoring step; the AST tool handles the execution.

---

*Research files: `research/codemods/` — fixture codebase, jscodeshift transform, and jssg transform*
