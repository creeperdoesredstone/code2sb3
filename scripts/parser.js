import { TT, Token, Result, Position, InvalidSyntax } from "./helper.js";

/**
 * Base Node class. All nodes inherit from this class.
 */
export class Node {
	/**
	 * @param {Position} startPos - The node's start position.
	 * @param {Position} endPos - The node's end position.
	 */
	constructor(startPos, endPos) {
		this.startPos = startPos;
		this.endPos = endPos;
	}

	toString() {
		return "<NODE>";
	}
}

/**
 * A collection of statements.
 */
export class Statements extends Node {
	/**
	 * @param {Node[]} statements - The statements collected by the node.
	 */
	constructor(statements) {
		super();
		this.statements = statements;
	}

	toString() {
		let res = "{\n";
		this.statements.forEach((stmt) => {
			res += stmt.toString() + "\n";
		});
		return res + "}";
	}
}

/**
 * A node holding a number.
 */
export class NumberNode extends Node {
	/**
	 * @param {Position} startPos - The node's start position.
	 * @param {Position} endPos - The node's end position.
	 * @param {number} value - The node's value.
	 */
	constructor(startPos, endPos, value) {
		super(startPos, endPos);
		this.value = value;
	}

	toString() {
		return `${this.value}`;
	}
}

/**
 * A node holding an identifer.
 */
export class Identifier extends Node {
	/**
	 * @param {Position} startPos - The node's start position.
	 * @param {Position} endPos - The node's end position.
	 * @param {string} value - The node's value.
	 */
	constructor(startPos, endPos, value) {
		super(startPos, endPos);
		this.value = value;
	}

	toString() {
		return `${this.value}`;
	}
}

/**
 * A node holding a binary operation.
 */
export class BinOpNode extends Node {
	/**
	 * @param {Position} startPos - The node's start position.
	 * @param {Position} endPos - The node's end position.
	 * @param {Node} left - The node's first operand.
	 * @param {Token} op - The node's operator.
	 * @param {Node} right - The node's second operand.
	 */
	constructor(startPos, endPos, left, op, right) {
		super(startPos, endPos);
		this.left = left;
		this.op = op;
		this.right = right;
	}

	toString() {
		return `(${this.left}, ${this.op}, ${this.right})`;
	}
}

/**
 * A node holding a binary operation.
 */
export class UnaryOpNode extends Node {
	/**
	 * @param {Position} startPos - The node's start position.
	 * @param {Position} endPos - The node's end position.
	 * @param {Token} op - The node's operator.
	 * @param {Node} value - The node's second operand.
	 */
	constructor(startPos, endPos, op, value) {
		super(startPos, endPos);
		this.op = op;
		this.value = value;
	}

	toString() {
		return `(${this.op}, ${this.right})`;
	}
}

/**
 * A node holding a variable declaration.
 */
export class VarDeclaration extends Node {
	/**
	 * @param {Position} startPos - The node's start position.
	 * @param {Position} endPos - The node's end position.
	 * @param {string} varName - The variable name.
	 * @param {Node} value - The value of the variable.
	 */
	constructor(startPos, endPos, varName, value) {
		super(startPos, endPos);
		this.varName = varName;
		this.value = value;
	}

	toString() {
		return `($${this.varName} = ${this.value})`;
	}
}

/**
 * A node holding an assignment.
 */
export class Assignment extends Node {
	/**
	 * @param {Position} startPos - The node's start position.
	 * @param {Position} endPos - The node's end position.
	 * @param {string} varName - The variable name.
	 * @param {Node} value - The value of the variable.
	 */
	constructor(startPos, endPos, varName, value) {
		super(startPos, endPos);
		this.varName = varName;
		this.value = value;
	}

	toString() {
		return `(${this.varName} = ${this.value})`;
	}
}

/**
 * A node holding a for loop.
 */
export class ForLoop extends Node {
	/**
	 * @param {Position} startPos - The node's start position.
	 * @param {Position} endPos - The node's end position.
	 * @param {VarDeclaration|Assignment} startAsgnNode - The variable name.
	 * @param {Node} endNode - The end value of the for loop.
	 * @param {Node} stepNode - The step value of the for loop.
	 * @param {Statements} body - The loop's body.
	 */
	constructor(startPos, endPos, startAsgnNode, endNode, stepNode, body) {
		super(startPos, endPos);
		this.startAsgnNode = startAsgnNode;
		this.endNode = endNode;
		this.stepNode = stepNode;
		this.body = body;
	}
}

/**
 * Parses the array of tokens and returns an AST.
 * @param {Token[]} tokens - The array of tokens to parse.
 * @returns {Result}
 */
export function parse(tokens) {
	let idx = -1;
	let currentTok = null;
	advance();

	function advance() {
		idx++;
		if (idx < tokens.length) currentTok = tokens[idx];
		return currentTok;
	}

	// Parse
	const stmts = [];
	const res = new Result();
	let stmt;

	while (currentTok.type === TT.NEWLINE) advance();

	while (currentTok.type !== TT.END) {
		stmt = res.register(statement());
		if (res.error) return res;

		stmts.push(stmt);
		while (currentTok.type === TT.NEWLINE) advance();
	}
	return res.success(new Statements(stmts));

	/**
	 *
	 * @param {Array<Array<(string|number|TT)>} ops - The operations to check. Format: `[[TT_1, val_1], [TT_2, val_2], ...]`
	 * @param {function} fLeft - The function for the left operand.
	 * @param {function|undefined} fRight - The function for the right operand. Can be left blank to default to `fLeft`.
	 */
	function binaryOp(ops, fLeft, fRight = undefined) {
		const res = new Result();
		if (!fRight) fRight = fLeft;

		let left = res.register(fLeft());
		if (res.error) return res;

		let op, right;

		while (
			ops.some(
				(o) => o[0] === currentTok.type && o[1] === currentTok.value
			)
		) {
			op = currentTok;
			advance();

			right = res.register(fRight());
			if (res.error) return res;

			left = new BinOpNode(left.startPos, right.endPos, left, op, right);
		}
		return res.success(left);
	}

	function statement() {
		if (currentTok.type === TT.KEYWORD) {
			switch (currentTok.value) {
				case "for":
					return forLoop();
			}
		}
		if (currentTok.type === TT.DECLARE) return declaration();
		return expr();
	}

	function declaration() {
		const startPos = currentTok.startPos;
		const res = new Result();
		advance();

		if (currentTok.type !== TT.IDEN)
			return res.fail(
				new InvalidSyntax(
					currentTok.startPos,
					currentTok.endPos,
					"Expected an identifier after '$'."
				)
			);
		const varName = currentTok.value;
		advance();

		if (currentTok.type !== TT.ASGN)
			return res.fail(
				new InvalidSyntax(
					currentTok.startPos,
					currentTok.endPos,
					"Expected '=' after variable name."
				)
			);
		advance();

		const value = res.register(expr());
		if (res.error) return res;

		return res.success(
			new VarDeclaration(startPos, value.endPos, varName, value)
		);
	}

	function forLoop() {
		const res = new Result();
		const startPos = currentTok.startPos;
		advance();

		const startAsgnNode = res.register(statement());
		if (res.error) return res;

		if (
			!(
				startAsgnNode instanceof VarDeclaration ||
				startAsgnNode instanceof Assignment
			)
		)
			return res.fail(
				new InvalidSyntax(
					startAsgnNode.startPos,
					startAsgnNode.endPos,
					"Expected a declaration or assignment after 'for' keyword."
				)
			);

		if (currentTok.type !== TT.ARROW)
			return res.fail(
				new InvalidSyntax(
					currentTok.startPos,
					currentTok.endPos,
					"Expected '->' after assignment or declaration."
				)
			);
		advance();

		const endNode = res.register(expr());
		if (res.error) return res;

		let stepNode = null;
		if (currentTok.type === TT.KEYWORD && currentTok.value === "step") {
			advance();
			stepNode = res.register(expr());
			if (res.error) return res;
		}

		if (!(currentTok.type === TT.KEYWORD && currentTok.value === "do"))
			return res.fail(
				new InvalidSyntax(
					currentTok.startPos,
					currentTok.endPos,
					"Expected 'do' after end/step value."
				)
			);
		advance();

		const body = new Statements([]);
		while (
			currentTok.type !== TT.END &&
			!(currentTok.type === TT.KEYWORD && currentTok.value === "endfor")
		) {
			stmt = res.register(statement());
			if (res.error) return res;

			body.statements.push(stmt);
		}

		if (!(currentTok.type === TT.KEYWORD && currentTok.value === "endfor"))
			return res.fail(
				new InvalidSyntax(
					currentTok.startPos,
					currentTok.endPos,
					"Expected 'endfor' after for loop."
				)
			);
		const endPos = currentTok.endPos;
		advance();

		return res.success(
			new ForLoop(
				startPos,
				endPos,
				startAsgnNode,
				endNode,
				stepNode,
				body
			)
		);
	}

	function expr() {
		const res = new Result();
		const left = res.register(logical());
		if (res.error) return res;

		if (currentTok.type === TT.ASGN) {
			if (!(left instanceof Identifier))
				return res.fail(
					new InvalidSyntax(
						left.startPos,
						left.endPos,
						"Expected an identifier before '='."
					)
				);
			advance();
			const value = res.register(logical());
			if (res.error) return res;

			return res.success(
				new Assignment(left.startPos, value.endPos, left.value, value)
			);
		} else {
			return res.success(left);
		}
	}

	function logical() {
		return binaryOp(
			[
				[TT.OPERATOR, "&&"],
				[TT.OPERATOR, "||"],
			],
			comparison
		);
	}

	function comparison() {
		return binaryOp(
			[
				[TT.OPERATOR, "<"],
				[TT.OPERATOR, ">"],
				[TT.OPERATOR, "=="],
				[TT.OPERATOR, "!="],
				[TT.OPERATOR, "<="],
				[TT.OPERATOR, ">="],
			],
			additive
		);
	}

	function additive() {
		return binaryOp(
			[
				[TT.OPERATOR, "+"],
				[TT.OPERATOR, "-"],
			],
			multiplicative
		);
	}

	function multiplicative() {
		return binaryOp(
			[
				[TT.OPERATOR, "*"],
				[TT.OPERATOR, "/"],
				[TT.OPERATOR, "%"],
			],
			unary
		);
	}

	function unary() {
		const res = new Result();
		if (currentTok.type === TT.OPERATOR && "+-".includes(currentTok.value)) {
			const op = currentTok;
			advance();
			const value = res.register(unary());
			if (res.error) return res;

			return res.success(new UnaryOpNode(op.startPos, value.endPos, op, value))
		}
		return atom();
	}

	function atom() {
		const res = new Result();
		const tok = currentTok;
		let expression;
		advance();

		if (tok.type === TT.NUM)
			return new Result().success(
				new NumberNode(tok.startPos, tok.endPos, tok.value)
			);
		if (tok.type === TT.IDEN) {
			return new Result().success(
				new Identifier(tok.startPos, tok.endPos, tok.value)
			);
		}
		if (tok.type === TT.LPR) {
			expression = res.register(expr());
			if (res.error) return res;

			if (currentTok.type !== TT.RPR)
				return res.fail(
					new InvalidSyntax(
						currentTok.startPos,
						currentTok.endPos,
						"Expected matching ')'."
					)
				);
			advance();
			return res.success(expression);
		}

		return new Result().fail(
			new InvalidSyntax(
				tok.startPos,
				tok.endPos,
				`Unexpected token: ${tok.type.description}`
			)
		);
	}
}
