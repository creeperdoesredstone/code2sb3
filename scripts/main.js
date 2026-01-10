import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { validateStatements, Environment } from "./ast.js";
import { emitScratch } from "./blocks.js";
import { renderBlocks } from "./render.js";

const code = document.getElementById("code");
const fnInp = document.getElementById("inp-project-name");
const compileBtn = document.getElementById("btn-compile");

function run() {
	document.getElementById("btn-export").disabled = true;
	document.getElementById("blocks").innerHTML = "";
	const fn = fnInp.value;
	const ftxt = code.innerText;

	if (!ftxt) return null;

	const lexRes = lex(fn, ftxt);
	if (lexRes.error) return lexRes;

	const ast = parse(lexRes.value);
	if (ast.error) return ast;

	const validateRes = validateStatements(ast.value, new Environment());
	if (validateRes.error) return validateRes;

	const blockRes = emitScratch(validateRes.value);
	return blockRes;
}

compileBtn.addEventListener("click", () => {
	const result = run();
	if (!result) return;
	console.log(result.error ? result.error : result.value);

	if (!result.error) {
		document.getElementById("btn-export").disabled = false;
		renderBlocks(result.value);
		sessionStorage.setItem("blocks", JSON.stringify(result.value));
	}
});
