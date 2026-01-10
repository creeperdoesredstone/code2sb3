import { Result, CompileError } from "./helper.js";

const blocks = {};
export const variables = {};

const logicalOps = [
	"operator_lt",
	"operator_gt",
	"operator_equals",
	"operator_and",
	"operator_or",
];

function newId() {
	return crypto.randomUUID();
}

function getVariableId(name) {
	for (const [key, value] of Object.entries(variables)) {
		if (value[0] === name) return key;
	}

	const newVarId = newId();
	variables[newVarId] = [name, 0];
	return newVarId;
}

function emitIdentifier(node) {
	const varId = getVariableId(node.value);
	console.log(varId);
	// Format: [Type 12, Name, ID]
	return [
		[12, node.value, varId],
		[4, ""],
	];
}

function emitOperator(node, parentId) {
	const id = newId();
	const res = new Result();

	function emitInput(inpNode) {
		let inpId;
		const res = new Result();
		if (inpNode.kind === "number") {
			inpId = [4, String(inpNode.value)];
		} else if (inpNode.kind === "identifier") {
			inpId = emitIdentifier(inpNode);
		} else {
			inpId = res.register(emit(inpNode, id));
			if (res.error) return res;
		}
		return res.success(inpId);
	}

	const leftId = res.register(emitInput(node.inputs[0]));
	if (res.error) return res;
	const rightId = res.register(emitInput(node.inputs[1]));
	if (res.error) return res;

	blocks[id] = {
		opcode: node.opcode,
		inputs: {
			NUM1:
				leftId.length === 2 && leftId[0][0] === 12
					? [3, leftId[0], leftId[1]]
					: [1, leftId],
			NUM2:
				rightId.length === 2 && rightId[0][0] === 12
					? [3, rightId[0], rightId[1]]
					: [1, rightId],
		},
		fields: {},
		parent: parentId,
		next: null,
		shadow: false,
		topLevel: false,
	};

	if (logicalOps.includes(node.opcode))
		blocks[id].inputs = {
			OPERAND1:
				leftId.length === 2 && leftId[0][0] === 12
					? [3, leftId[0], leftId[1]]
					: [1, leftId],
			OPERAND2:
				rightId.length === 2 && rightId[0][0] === 12
					? [3, rightId[0], rightId[1]]
					: [1, rightId],
		};

	return res.success(id);
}

function emitDeclaration(node) {
	const res = new Result();
	const varId = newId();

	variables[varId] = [node.varName, 0];

	if (node.value) {
		const valueId =
			node.value.kind !== "number"
				? res.register(emit(node.value))
				: [10, String(node.value.value)];
		const type = valueId?.length === 2 && valueId[0][0] === 12 ? 3 : 1;
		if (res.error) return res;

		const setId = newId();
		blocks[setId] = {
			opcode: "data_setvariableto",
			inputs: {
				VALUE:
					type === 1
						? [type, valueId]
						: [type, valueId[0], valueId[1]],
			},
			fields: {
				VARIABLE: [node.varName, varId],
			},
			parent: null,
			next: null,
			shadow: false,
			topLevel: false,
		};

		return res.success(setId);
	}
}

function emitFor(node, parentId) {
	const res = new Result();
	const startAsgn = res.register(emit(node.startAsgn, parentId));
	if (res.error) return res;

	const repeatId = newId();
}

function wrapInScript() {
	const flagId = newId();

	blocks[flagId] = {
		opcode: "event_whenflagclicked",
		inputs: {},
		fields: {},
		parent: null,
		next: null,
		shadow: false,
		topLevel: true,
		x: 100,
		y: 100,
	};

	return flagId;
}

function wrapInSay(exprRootId, parentId) {
	const sayId = newId();
	if (blocks[exprRootId] && !("opcode" in blocks[exprRootId])) {
		exprRootId = [10, blocks[exprRootId].value];
	}

	const type = exprRootId.length === 2 && exprRootId[0][0] === 12 ? 3 : 1;

	if (
		!blocks[exprRootId] ||
		blocks[exprRootId]?.opcode.startsWith("operator_") ||
		(exprRootId[1] && exprRootId[0] === 10)
	) {
		blocks[sayId] = {
			opcode: "looks_say",
			inputs: {
				MESSAGE:
					type === 1
						? [type, exprRootId]
						: [type, exprRootId[0], exprRootId[1]],
			},
			fields: {},
			parent: parentId,
			next: null,
			shadow: false,
			topLevel: false,
		};
		if (blocks[exprRootId]?.opcode) blocks[exprRootId].parent = sayId;
		return sayId;
	}
	blocks[parentId].next = exprRootId;
	return exprRootId;
}

function emit(node, parentId) {
	const res = new Result();
	switch (true) {
		case node.kind === "number":
			const numId = newId();
			blocks[numId] = { value: String(node.value) };
			return res.success(numId);

		case node.kind === "identifier":
			return res.success(emitIdentifier(node));

		case node.opcode?.startsWith("operator_"):
			return emitOperator(node, parentId);

		case node.opcode === "assign":
		case node.opcode === "declaration":
			return emitDeclaration(node);

		case node.opcode === "for":
			return emitFor(node, parentId);

		default:
			return res.fail(
				new CompileError(
					node.startPos,
					node.endPos,
					`Unknown AST node type: ${
						node.kind ?? node.opcode ?? "<unk>"
					}`
				)
			);
	}
}

export function emitScratch(ast) {
	const res = new Result();
	Object.keys(blocks).forEach((key) => delete blocks[key]);
	Object.keys(variables).forEach((key) => delete variables[key]);

	let exprRootId;

	// Support single expression at top level
	if (!ast) {
		return res.fail(new CompileError(null, null, "No AST provided"));
	}

	const flagId = wrapInScript();

	exprRootId = res.register(emit(ast[0]));
	if (res.error) return res;
	let lastBlockId = wrapInSay(exprRootId, flagId);
	blocks[flagId].next = lastBlockId;

	for (let i = 1; i < ast.length; i++) {
		const currentBlockId = res.register(emit(ast[i]));
		if (res.error) return res;
		const currentWrapper = wrapInSay(currentBlockId, lastBlockId);
		blocks[lastBlockId].next = currentWrapper;
		lastBlockId = currentWrapper;
	}

	return res.success(blocks);
}
