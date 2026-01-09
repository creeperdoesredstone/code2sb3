import { Position, TT, Token, InvalidChar, Result } from "./helper.js";

/**
 * Processes the file and returns an array of tokens.
 * @param {string} fn - The file name.
 * @param {string} ftxt - The contents of the file.
 * @returns {Result}
 */
export function lex(fn, ftxt) {
	let pos = new Position(-1, 0, -1, fn, ftxt);
	let currentChar = "";
	const tokens = [];
	const res = new Result();
	advance();

	const DIGITS = "0123456789";
	const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const VALID_IDEN = LETTERS + DIGITS + "_";

	function advance() {
		pos.advance(currentChar);
		currentChar = pos.idx < ftxt.length ? ftxt[pos.idx] : null;
	}

	let startPos = pos.copy();
	let dotCount = 0;
	let resStr = "";
	while (currentChar !== null) {
		startPos = pos.copy();
		switch (true) {
			case currentChar === " ":
			case currentChar === "\t":
				advance();
				break;
			case currentChar === "\n":
			case currentChar === ";":
				tokens.push(new Token(startPos, pos.copy(), TT.NEWLINE));
				advance();
				break;
			case currentChar === "(":
				tokens.push(new Token(startPos, pos.copy(), TT.LPR));
				advance();
				break;
			case currentChar === ")":
				tokens.push(new Token(startPos, pos.copy(), TT.RPR));
				advance();
				break;
			case currentChar === "$":
				tokens.push(new Token(startPos, pos.copy(), TT.DECLARE));
				advance();
				break;
			case currentChar === "=":
				tokens.push(new Token(startPos, pos.copy(), TT.ASGN));
				advance();
				break;
			case "+-*%".includes(currentChar):
				tokens.push(
					new Token(startPos, pos.copy(), TT.OPERATOR, currentChar)
				);
				advance();
				break;
			case currentChar === "/":
				advance();
				if (currentChar === "/") {
					while (currentChar !== null && currentChar !== "\n")
						advance(); // Skip comments
					break;
				}
				tokens.push(new Token(startPos, startPos, TT.OPERATOR, "/"));
				break;
			case DIGITS.includes(currentChar):
				dotCount = 0;
				resStr = "";
				while (
					currentChar !== null &&
					(DIGITS.includes(currentChar) || currentChar === ".")
				) {
					if (currentChar === ".") {
						dotCount++;
						if (dotCount > 1) break;
					}
					resStr += currentChar;
					advance();
				}
				tokens.push(
					new Token(startPos, pos.copy(), TT.NUM, Number(resStr))
				);
				break;
			case ("_" + LETTERS).includes(currentChar):
				resStr = "";
				while (
					currentChar !== null &&
					VALID_IDEN.includes(currentChar)
				) {
					resStr += currentChar;
					advance();
				}
				tokens.push(new Token(startPos, pos.copy(), TT.IDEN, resStr));
				break;
			default:
				return res.fail(
					new InvalidChar(startPos, pos.copy(), `'${currentChar}'`)
				);
		}
	}

	tokens.push(new Token(pos.copy(), pos.copy(), TT.END));
	return res.success(tokens);
}
