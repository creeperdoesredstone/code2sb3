import { Result, CompileError } from "./helper.js";

const blocks = {};
const symbols = {};

function newId() {
	return crypto.randomUUID();
}

function emitOperator(node, parentId) {
	const id = newId();
	const res = new Result();

	let leftId, rightId;
	if (node.inputs[0].kind === "number") {
		leftId = [4, String(node.inputs[0].value)];
	} else {
		leftId = res.register(emit(node.inputs[0], id));
		if (res.error) return res;
	}

	if (node.inputs[1].kind === "number") {
		rightId = [4, String(node.inputs[1].value)];
	} else {
		rightId = res.register(emit(node.inputs[1], id));
		if (res.error) return res;
	}

	blocks[id] = {
		opcode: node.opcode,
		inputs: {
			NUM1: [1, leftId],
			NUM2: [1, rightId],
		},
		fields: {},
		parent: parentId,
		next: null,
		shadow: false,
		topLevel: false,
	};

	return res.success(id);
}

function wrapInScript(exprRootId) {
	const flagId = newId();
	const sayId = newId();

	blocks[flagId] = {
		opcode: "event_whenflagclicked",
		inputs: {},
		fields: {},
		parent: null,
		next: sayId,
		shadow: false,
		topLevel: true,
		x: 100,
		y: 100,
	};

	if (!blocks[exprRootId].opcode) {
		exprRootId = [10, blocks[exprRootId].value];
	}

	blocks[sayId] = {
		opcode: "looks_say",
		inputs: {
			MESSAGE: [1, exprRootId],
		},
		fields: {},
		parent: flagId,
		next: null,
		shadow: false,
		topLevel: false,
	};

	// Set expression root parent
	console.log(blocks[exprRootId]);
	if (blocks[exprRootId]?.opcode) blocks[exprRootId].parent = sayId;
}

function emit(node, parentId) {
	const res = new Result();
	switch (true) {
		case node.kind === "number":
			const numId = newId();
			blocks[numId] = { value: String(node.value) };
			return res.success(numId);

		case node.opcode.startsWith("operator_"):
			return emitOperator(node, parentId);

		case node.opcode === "declaration":
			const varId = newId();
			const varValue = res.register(emit(node.value, varId));
			if (res.error) return res;
			symbols[varId] = [node.varName, varValue];
			return res.success(varId);

		default:
			console.log(`Unknown AST node type: ${node.kind}`);
			return res.fail(
				new CompileError(
					node.startPos,
					node.endPos,
					`Unknown AST node type: ${node.kind}`
				)
			);
	}
}

export function emitScratch(ast) {
	const res = new Result();
	Object.keys(blocks).forEach((k) => delete blocks[k]);

	let exprRootId;

	// Support single expression at top level
	if (!ast) {
		return res.fail(new CompileError(null, null, "No AST provided"));
	}

	exprRootId = res.register(emit(ast[0]));
	if (res.error) return res;
	console.log(blocks);
	wrapInScript(exprRootId);

	return res.success(blocks);
}
