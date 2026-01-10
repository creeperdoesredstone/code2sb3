import { Result, CompileError } from "./helper.js";
import * as Nodes from "./parser.js";

const OPERATOR_MAP = {
	"+": "operator_add",
	"-": "operator_subtract",
	"*": "operator_multiply",
	"/": "operator_divide",
	"<": "operator_lt",
	">": "operator_gt",
	"==": "operator_equals",
	"&&": "operator_and",
	"||": "operator_or",
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
 * @param {Nodes.Statements} stmts - The AST to verify.
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

function isConstant(node) {
	return node.kind === "number";
}

function foldBinary(op, left, right) {
	switch (op) {
		case "+":
			return left + right;
		case "-":
			return left - right;
		case "*":
			return left * right;
		case "/":
			if (right === 0) return null; // optional: error later
			return left / right;
		case "<":
			return left < right ? 1 : 0;
		case ">":
			return left > right ? 1 : 0;
		case "==":
			return left === right ? 1 : 0;
		case "&&":
			return left && right ? 1 : 0;
		case "||":
			return left || right ? 1 : 0;
		default:
			return null;
	}
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
						`Symbol ${node.value} is not defined.`
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

			if (isConstant(left) && isConstant(right)) {
				const folded = foldBinary(
					node.op.value,
					Number(left.value),
					Number(right.value)
				);

				if (folded !== null) {
					return res.success({
						kind: "number",
						value: folded,
					});
				}
			}

			return res.success({
				kind: "block",
				opcode: OPERATOR_MAP[node.op.value],
				inputs: [left, right],
			});
		case "UnaryOpNode":
			const unaryVal = res.register(validateNode(node.value, env));
			if (res.error) return res;

			if (node.op.value === "+") return res.success(unaryVal);

			if (isConstant(unaryVal))
				return res.success({
					kind: "number",
					value: -unaryVal.value,
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

			const varValue = res.register(validateNode(node.value, env));
			if (res.error) return res;
			env.symbols[node.varName] = varValue;
			return res.success({
				opcode: "declaration",
				varName: node.varName,
				value: varValue,
			});
		case "Assignment":
			if (!(node.varName in env.symbols))
				return res.fail(
					new CompileError(
						node.startPos,
						node.endPos,
						`Symbol ${node.varName} is not defined.`
					)
				);
			const asgnValue = res.register(validateNode(node.value, env));
			if (res.error) return res;
			env.symbols[node.varName] = asgnValue;
			return res.success({
				opcode: "assign",
				varName: node.varName,
				value: asgnValue,
			});
		case "ForLoop":
			const startAsgn = res.register(
				validateNode(node.startAsgnNode, env)
			);
			if (res.error) return res;

			const endValue = res.register(validateNode(node.endNode, env));
			if (res.error) return res;

			const stepValue = res.register(
				validateNode(
					node.stepValue || new Nodes.NumberNode(null, null, 1),
					env
				)
			);
			if (res.error) return res;

			const body = res.register(validateStatements(node.body, env));
			if (res.error) return res;

			return res.success({
				opcode: "for",
				startAsgn: startAsgn,
				endValue: endValue,
				stepValue: stepValue,
				body: body,
			});
		default:
			return res.fail(
				new CompileError(
					node.startPos,
					node.endPos,
					`Unexpected node: ${node?.constructor?.name}`
				)
			);
	}
}
