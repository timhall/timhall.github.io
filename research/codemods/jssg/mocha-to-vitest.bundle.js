//#region mocha-to-vitest.ts
const transform = (root) => {
	const n = root.root();
	const edits = [];
	const specifiers = [
		"describe",
		"it",
		"expect"
	];
	if (n.findAll({ rule: { pattern: "beforeEach($$$ARGS)" } }).length > 0) specifiers.push("beforeEach");
	if (n.findAll({ rule: { pattern: "afterEach($$$ARGS)" } }).length > 0) specifiers.push("afterEach");
	const vitestImport = `import { ${specifiers.join(", ")} } from "vitest";`;
	const assertRequires = n.findAll({ rule: { pattern: `const assert = require("assert")` } });
	const chaiRequires = n.findAll({ rule: { pattern: `const { expect } = require("chai")` } });
	const libRequires = [...assertRequires, ...chaiRequires];
	if (libRequires.length === 0) return null;
	edits.push(libRequires[0].replace(vitestImport));
	for (let i = 1; i < libRequires.length; i++) edits.push(libRequires[i].replace(""));
	n.findAll({ rule: { any: [{ pattern: "assert.strictEqual($A, $B)" }, { pattern: "assert.equal($A, $B)" }] } }).forEach((node) => {
		const a = node.getMatch("A").text();
		const b = node.getMatch("B").text();
		edits.push(node.replace(`expect(${a}).toBe(${b})`));
	});
	n.findAll({ rule: { pattern: "assert.deepEqual($A, $B)" } }).forEach((node) => {
		const a = node.getMatch("A").text();
		const b = node.getMatch("B").text();
		edits.push(node.replace(`expect(${a}).toEqual(${b})`));
	});
	n.findAll({ rule: { pattern: "assert.ok($A)" } }).forEach((node) => {
		const a = node.getMatch("A").text();
		edits.push(node.replace(`expect(${a}).toBeTruthy()`));
	});
	n.findAll({ rule: { pattern: "assert.throws($A, $B)" } }).forEach((node) => {
		const a = node.getMatch("A").text();
		const b = node.getMatch("B").text();
		edits.push(node.replace(`expect(${a}).toThrow(${b})`));
	});
	n.findAll({ rule: { pattern: "assert.rejects($A, $B)" } }).forEach((node) => {
		const a = node.getMatch("A").text();
		const b = node.getMatch("B").text();
		edits.push(node.replace(`expect(${a}).rejects.toThrow(${b})`));
	});
	n.findAll({ rule: { pattern: "expect($A).to.equal($B)" } }).forEach((node) => {
		const a = node.getMatch("A").text();
		const b = node.getMatch("B").text();
		edits.push(node.replace(`expect(${a}).toBe(${b})`));
	});
	n.findAll({ rule: { pattern: "expect($A).to.deep.equal($B)" } }).forEach((node) => {
		const a = node.getMatch("A").text();
		const b = node.getMatch("B").text();
		edits.push(node.replace(`expect(${a}).toEqual(${b})`));
	});
	return n.commitEdits(edits);
};
var mocha_to_vitest_default = transform;

//#endregion
export { mocha_to_vitest_default as default };