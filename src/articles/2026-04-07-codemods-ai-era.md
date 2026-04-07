---
title: "Codemods in the AI Era"
slug: codemods-ai-era
publishedAt: null
---

# Codemods in the AI Era

Codemods — programmatic transformations of source code — have long been the tool of choice for large-scale migrations: renaming APIs, upgrading framework versions, enforcing new patterns across thousands of files. Tools like [jscodeshift](https://github.com/facebook/jscodeshift) made this tractable, but writing them has always required deep knowledge of AST manipulation APIs. Now that LLMs can write code fluently, the natural question is: can AI write codemods for us?

The short answer is: sort of — but the friction reveals something deeper about how LLMs understand code.

---

## The Promise: Natural Language → Codemod

Tools like [Codemod Studio](https://codemod.com/) let you describe a transformation in plain English and have an LLM generate a working jscodeshift or ast-grep codemod. This is genuinely useful — if you know what you want but don't know the jscodeshift API well, the LLM can save you a lot of time.

But in practice, vanilla GPT-4o achieves only ~45% success generating correct jscodeshift codemods on the first try. The failures break down as:
- ~25% syntax/type errors (TypeScript compiler catches them)
- ~12% runtime errors (jscodeshift runner crashes)
- ~18% codemods that run but produce wrong output

That's a lot of wasted iterations.

---

## Why LLMs Struggle with Codemods

### Text vs. Structure

LLMs process code as **token sequences**. They're extremely good at recognizing patterns in text — which is why they can write fluent JavaScript — but codemods require operating on the **structural relationships** in code: parent/child node relationships, scope chains, type information, visitor traversal order.

A codemod isn't a text transformation; it's a transformation of a tree. When an LLM writes:

```js
root.find(j.CallExpression, { callee: { name: 'foo' } })
  .replaceWith(/* ... */)
```

it's generating tokens that *look right* but may reflect a misunderstanding of the AST shape. The LLM has seen a lot of jscodeshift code in training, but it hasn't "run" any of it — it can't verify whether `.find()` returns a typed collection that supports the methods being called.

### API Hallucination

jscodeshift's API surface is a particular trap. Collections are typed (you can't call FunctionExpression methods on an Identifier collection), visitor patterns are specific, and common mistakes are subtle. The LLM has limited training data on jscodeshift's specifics and will confidently generate plausible-looking but incorrect API calls.

Newer tools like [ast-grep](https://ast-grep.github.io/) are worse still — they have even less training data, and models will sometimes invent syntax borrowing patterns from jscodeshift or CodeQL.

### Scale and Context

Even when an LLM understands the transformation, applying it across a large codebase requires context the LLM doesn't have: cross-file dependencies, type information, import graphs. A transformation that's trivial in one file might need coordination across dozens of others. Processing full file text for every target file is token-expensive and hits context windows quickly.

---

## What Actually Works

### Iterative Feedback Loops

Codemod.com's iterative AI system demonstrates the most practical improvement: generate a codemod, run the TypeScript compiler, run jscodeshift, diff the output against expected — then feed all of that back to the LLM to refine. This multi-pass approach lifts success rates substantially (toward 80%+). The LLM isn't smarter, but it gets corrective signal it can act on.

This is similar to how AI coding assistants work best: not one-shot generation but iterative dialogue with real feedback.

### Hybrid: AST Finds, AI Transforms

A compelling pattern is using deterministic AST tools for *detection and locating* (precise, fast, no hallucination) and AI for *transformation* (flexible, context-aware). For example:

1. Use tree-sitter or ast-grep to find all call sites matching a pattern
2. Extract the surrounding context for each match
3. Use an LLM to rewrite just that localized snippet

This limits the LLM's surface area to something it can reason about reliably, while letting the AST layer handle structural navigation.

### Giving LLMs AST Context

If the LLM doesn't know the AST shape, you can tell it. Providing annotated AST dumps, type schemas, or explicit documentation of the jscodeshift/ast-grep API inline in the prompt reduces hallucination significantly. This is a form of RAG — grounding the LLM in verified external knowledge rather than relying on training data.

[Moderne](https://www.moderne.ai/) takes this furthest with their Lossless Semantic Trees (LSTs): type-aware tree structures that preserve full semantic information, letting AI be applied surgically only where needed, with 100% accurate structural changes otherwise.

### ast-grep as an AI-Friendly Tool

ast-grep is notably more LLM-compatible than jscodeshift. Its declarative YAML rule format is simpler and more consistent — less surface area to hallucinate. It also provides an MCP server, meaning AI assistants (Claude Code, Cursor) can invoke ast-grep directly for structural search as part of a larger task, bypassing the need for the LLM to *write* AST manipulation code at all.

---

## The Deeper Issue: Semantic vs. Syntactic

The real challenge isn't just API knowledge — it's semantic equivalence. A codemod must transform code without changing its behavior. LLMs are good at recognizing semantic patterns ("this is doing X") but poor at formally verifying semantic equivalence after transformation. They can make a change that looks right but subtly alters behavior at an edge case.

Traditional codemods avoid this by making only structural changes that are provably equivalent by construction. LLMs can reason about equivalence informally but can't guarantee it.

This is why the hybrid approach — deterministic structure + targeted AI — is where the field seems to be heading. The AI handles the parts that require judgment (semantic naming, handling heterogeneous call patterns), while deterministic tools handle the parts that require precision.

---

## Where This Leaves Us

AI-assisted codemod writing is genuinely useful today, especially for common, well-documented transformations where jscodeshift patterns are well-represented in training data. But raw LLM output is unreliable enough that workflow design matters a lot:

- **Iterative feedback loops** (compiler + runner validation) are the most impactful improvement
- **Hybrid detection/transformation** reduces the LLM's scope to what it handles well
- **Grounding via AST schemas and docs** reduces hallucination
- **Newer AST-aware tools** (ast-grep, Moderne) are designed with LLM integration in mind

The vision of "describe your migration in English, get a codemod" is plausible — but it needs the scaffolding around the LLM, not just the LLM alone.

---

*Draft — links and examples to be expanded*
