export function renderBlocks(blocksJSON) {
	const container = document.getElementById("blocks");
	container.innerHTML = ""; // Clear previous renders

	// 1. Find the top-level block (the one with 'topLevel: true')
	const topBlockId = Object.keys(blocksJSON).find(
		(id) => blocksJSON[id].topLevel
	);

	if (!topBlockId) return;

	// 2. Convert JSON to scratchblocks text
	const scratchText = blocksToText(topBlockId, blocksJSON);

	// 3. Render it into the div
	const doc = scratchblocks.parse(scratchText);
	const svg = scratchblocks.render(doc, {
		style: "scratch3",
		scale: 1,
	});

	container.appendChild(svg);
}

function blocksToText(topBlockId, blocksJSON) {
	const lines = [];
	const seen = new Set();

	const inputToText = (inp) => {
		if (!inp) return "";
		if (!Array.isArray(inp)) return String(inp);

		const type = inp[0];

		// literal value (e.g. [10, "5"])
		if (type === 10) return String(inp[1] ?? "");

		// normal input wrapper (e.g. [1, inner])
		if (type === 1) {
			const inner = inp[1];
			if (!inner) return "";
			if (typeof inner === "string" && blocksJSON[inner]) {
				const b = blocksJSON[inner];
				if (b.opcode && b.opcode.startsWith("operator_"))
					return operatorToText(inner);
				if ("value" in b) return String(b.value);
				return b.opcode ?? "";
			}
			if (Array.isArray(inner)) {
				// variable-like array [12, name, id] or similar
				if (inner[0] === 12) return String(inner[1] ?? "");
				return String(inner[1] ?? inner[0]);
			}
			return String(inner);
		}

		// variable reference (e.g. [3, [12,name,id], [4,""]])
		if (type === 3) {
			const maybeVar = inp[1];
			if (Array.isArray(maybeVar) && maybeVar[0] === 12)
				return String(maybeVar[1] ?? "");
			return String(maybeVar ?? "");
		}

		return String(inp[1] ?? "");
	};

	const processInput = (rawInput) => {
		return "(<".includes(rawInput[0]) ? rawInput : `(${rawInput})`;
	};

	const operatorToText = (blockId) => {
		const b = blocksJSON[blockId];
		if (!b) return "";

		const opMap = {
			operator_add: "+",
			operator_subtract: "-",
			operator_multiply: "*",
			operator_divide: "/",
			operator_lt: "<",
			operator_gt: ">",
			operator_equals: "=",
			operator_and: "and",
			operator_or: "or",
		};
		const logicalOps = ["<", ">", "=", "and", "or"];
		const sym = opMap[b.opcode] ?? b.opcode;

		const leftInp = b.inputs?.NUM1 ?? b.inputs?.OPERAND1 ?? null;
		const rightInp = b.inputs?.NUM2 ?? b.inputs?.OPERAND2 ?? null;

		const left = processInput(inputToText(leftInp));
		const right = processInput(inputToText(rightInp));

		if (left === "" && right === "") return String(b.opcode);
		const inputs = `${left} ${sym} ${right}`;
		return logicalOps.includes(sym) ? `<${inputs}>` : `(${inputs})`;
	};

	let id = topBlockId;
	while (id && !seen.has(id)) {
		seen.add(id);
		const block = blocksJSON[id];
		if (!block) break;

		switch (block.opcode) {
			case "event_whenflagclicked":
				lines.push("when flag clicked");
				break;

			case "looks_say": {
				const msg = processInput(inputToText(block.inputs?.MESSAGE));
				lines.push(`say ${msg}`);
				break;
			}

			case "data_setvariableto": {
				const varField = block.fields?.VARIABLE;
				const varName = Array.isArray(varField)
					? varField[0]
					: String(varField ?? "");
				const val = processInput(inputToText(block.inputs?.VALUE));
				lines.push(`set [${varName} v] to ${val}`);
				break;
			}

			default:
				if (block.opcode && block.opcode.startsWith("operator_")) {
					lines.push(operatorToText(id));
				} else if (block.opcode) {
					lines.push(block.opcode);
				}
				break;
		}

		id = block.next;
	}

	return lines.join("\n");
}
