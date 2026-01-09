const types = [
	"END",
	"NEWLINE",
	"KEYWORD",
	"IDEN",
	"NUM",
	"STRING",
	"OPERATOR",
	"LPR",
	"RPR",
	"DECLARE",
	"ASGN"
];

export const TT = Object.freeze(
	Object.fromEntries(types.map((key) => [key, Symbol(key)]))
);

/**
 * Holds a position.
 * @class
 * @param {number} idx - The index of the current character in `ftxt`.
 * @param {number} ln - The line number of the current character in `ftxt`.
 * @param {number} col - The column of the current character in `ftxt`.
 * @param {string} fn - The file name.
 * @param {string} ftxt - The contents of the file.
 */
export class Position {
	/**
	 * Holds a position.
	 * @param {number} idx - The index of the current character in `ftxt`.
	 * @param {number} ln - The line number of the current character in `ftxt`.
	 * @param {number} col - The column of the current character in `ftxt`.
	 * @param {string} fn - The file name.
	 * @param {string} ftxt - The contents of the file.
	 */
	constructor(idx, ln, col, fn, ftxt) {
		/** @member {number} */
		this.idx = idx;
		/** @member {number} */
		this.ln = ln;
		/** @member {number} */
		this.col = col;
		/** @member {string} */
		this.fn = fn;
		/** @member {string} */
		this.ftxt = ftxt;
	}

	/**
	 * Advances the current position.
	 * @param {string} currentChar - The current character
	 */
	advance(currentChar) {
		this.idx++;
		this.col++;
		if (currentChar === "\n") {
			this.col = 0;
			this.ln++;
		}
	}

	/**
	 * Returns a copy of the current position.
	 * @returns {Position}
	 */
	copy() {
		return new Position(this.idx, this.ln, this.col, this.fn, this.ftxt);
	}
}

/**
 * Holds the result of the current operation.
 */
export class Result {
	constructor() {
		/** @member {any} */
		this.value = null;
		/** @member {BaseError} */
		this.error = null;
	}

	/**
	 * Registers the result of the current operation.
	 * @param {Result} res - The result of the current operation.
	 * @returns {any}
	 */
	register(res) {
		if (res.error) this.error = res.error;
		return res.value;
	}

	/**
	 * Success!
	 * @param {any} value - The value of the successful operation.
	 * @returns {Result}
	 */
	success(value) {
		this.value = value;
		return this;
	}

	/**
	 * Failure!
	 * @param {BaseError} error - The error of the failed operation.
	 * @returns {Result}
	 */
	fail(error) {
		this.error = error;
		return this;
	}
}

/**
 * A token.
 * @param {Position} startPos - The start position of the token.
 * @param {Position} endPos - The end position of the token.
 * @param {TT} type - The type of the token.
 * @param {string} [value] - The value of the token.
 */
export class Token {
	/**
	 * A token.
	 * @param {Position} startPos - The start position of the token.
	 * @param {Position} endPos - The end position of the token.
	 * @param {TT} type - The type of the token.
	 * @param {string|null} [value] - The value of the token.
	 */
	constructor(startPos, endPos, type, value = null) {
		/** @member {Position} */
		this.startPos = startPos;
		/** @member {Position} */
		this.endPos = endPos;
		/** @member {TT} */
		this.type = type;
		/** @member {string|null} */
		this.value = value;
	}

	toString() {
		let res = this.type.description;
		if (this.value !== null) res += `:${this.value}`;
		return res;
	}
}

/**
 * Base error class
 * @param {Position} startPos - The start position of the token.
 * @param {Position} endPos - The end position of the token.
 * @param {string} name - The name of the error.
 * @param {string} msg - The error message.
 */
export class BaseError {
	/**
	 * Base error class
	 * @param {Position} startPos - The start position of the token.
	 * @param {Position} endPos - The end position of the token.
	 * @param {string} name - The name of the error.
	 * @param {string} msg - The error message.
	 */
	constructor(startPos, endPos, name, msg) {
		/** @member {Position} */
		this.startPos = startPos;
		/** @member {Position} */
		this.endPos = endPos;
		/** @member {string} */
		this.name = name;
		/** @member {string} */
		this.msg = msg;
	}

	toString() {
		return `File ${this.startPos.fn}, line ${this.startPos.ln + 1} col ${
			this.startPos.col + 1
		}\n\n${this.name}: ${this.details}`;
	}
}

export class InvalidChar extends BaseError {
	constructor(startPos, endPos, msg) {
		super(startPos, endPos, "Invalid Character", msg);
	}
}

export class InvalidSyntax extends BaseError {
	constructor(startPos, endPos, msg) {
		super(startPos, endPos, "Invalid Syntax", msg);
	}
}

export class CompileError extends BaseError {
	constructor(startPos, endPos, msg) {
		super(startPos, endPos, "Compilation Error", msg);
	}
}
