import { TT, Result, CompileError } from "./helper.js";
import * as Nodes from "./parser.js";

const OPERATOR_MAP = {
	"+": "operator_add",
	"-": "operator_subtract",
	"*": "operator_multiply",
	"/": "operator_divide",
	"<": "operator_lt",
	">": "operator_gt",
	"==": "operator_equals",
};

/**
 * An environment to store variables.
 */
export class Environment {
	/**
	 * @param {Environment|null} parent - The parent of the environment. Useful for local variables.
	 */
	constructor(parent = null) {
		this.symbols = {};
		this.parent = parent;
	}
}

/**
 * Verifies whether an AST is valid.
 * @param {Nodes.Statements} ast - The AST to verify.
 * @param {Environment} env - The environment to reference variables.
 * @returns {Result}
 */
export function validateStatements(stmts, env) {
	const res = new Result();
	const nodes = [];
	stmts.statements.forEach((stmt) => {
		const node = res.register(validateNode(stmt, env));
		if (res.error) return res;
		nodes.push(node);
	});

	return res.success(nodes);
}

/**
 * Verifies whether an AST is valid.
 * @param {Nodes.Node} node - The AST to verify.
 * @param {Environment} env - The environment to reference variables.
 * @returns {Result}
 */
function validateNode(node, env) {
	const res = new Result();

	switch (node.constructor.name) {
		case "NumberNode":
			return res.success({
				kind: "number",
				value: node.value,
			});
		case "Identifier":
			if (!(node.value in env.symbols))
				return res.fail(
					new CompileError(
						node.startPos,
						node.endPos,
						`Symbol ${node.varName} is not defined.`
					)
				);
			return res.success({
				kind: "identifier",
				value: node.value,
			});
		case "BinOpNode":
			const left = res.register(validateNode(node.left, env));
			if (res.error) return res;
			const right = res.register(validateNode(node.right, env));
			if (res.error) return res;

			return res.success({
				kind: "block",
				opcode: OPERATOR_MAP[node.op.value],
				inputs: [left, right],
			});
		case "VarDeclaration":
			if (node.varName in env.symbols)
				return res.fail(
					new CompileError(
						node.startPos,
						node.endPos,
						`Symbol ${node.varName} is already defined.`
					)
				);

			const value = res.register(validateNode(node.value, env));
			if (res.error) return res;
			env.symbols[node.varName] = value;
			return res.success({
				opcode: "declaration",
				name: node.varName,
				value: value,
			});
		default:
			return res.fail(
				new CompileError(
					node.startPos,
					node.endPos,
					`Unexpected node: ${node.constructor.name}`
				)
			);
	}
}
