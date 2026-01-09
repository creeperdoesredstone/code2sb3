export function renderBlocks(blocks) {
	const workspace = document.getElementById("blocks");
	workspace.innerHTML = "";

	for (const id in blocks) {
		if (blocks[id].topLevel) {
			workspace.appendChild(renderStack(blocks, id));
		}
	}
}

function renderStack(blocks, startId) {
	const container = document.createElement("div");
	container.className = "stack";

	let currentId = startId;
	while (currentId) {
		container.appendChild(renderBlock(blocks, currentId));
		currentId = blocks[currentId].next;
	}

	return container;
}

function renderBlock(blocks, blockId) {
	console.log(blockId);
	const block = blocks[blockId];
	if (!block) {
		if (typeof blockId === "object" || block.value) {
			return renderNumber(
				typeof blockId === "object" ? blockId : [4, block.value]
			);
		}
		throw new Error(`Block not found: ${blockId}`);
	}

	if (typeof blockId === "object" || block.value) {
		return renderNumber(
			typeof blockId === "object" ? blockId : [4, block.value]
		);
	}

	if (block.opcode.startsWith("operator_")) {
		return renderOperator(blocks, block);
	}

	if (block.opcode === "event_whenflagclicked") {
		return renderHat("flag");
	}

	if (block.opcode === "looks_say") {
		return renderSay(blocks, block);
	}

	return renderUnknown(block);
}

function renderHat(type) {
	const div = document.createElement("div");
	div.className = "block hat " + type;
	return div;
}

function renderSay(ir, block) {
	const div = document.createElement("div");
	div.className = "block say";

	const label = document.createElement("span");
	label.textContent = "say";
	div.appendChild(label);

	const msgId = block.inputs.MESSAGE[1];
	const input = document.createElement("span");
	input.className = "input";
	input.appendChild(renderBlock(ir, msgId));
	div.appendChild(input);

	return div;
}

function operatorLabel(opcode) {
	switch (opcode) {
		case "operator_add":
			return "+";
		case "operator_subtract":
			return "−";
		case "operator_multiply":
			return "*";
		case "operator_divide":
			return "/";
		case "operator_lt":
			return "<";
		case "operator_gt":
			return ">";
		case "operator_equals":
			return "=";
		default:
			return opcode;
	}
}

function renderNumber(block) {
	const span = document.createElement("span");
	span.className = "block number";
	span.textContent = block[1];
	return span;
}

function renderOperator(ir, block) {
	const div = document.createElement("div");
	div.className = "block operator";

	const leftId = block.inputs.NUM1[1];
	const rightId = block.inputs.NUM2[1];

	const left = document.createElement("span");
	left.className = "input";
	left.appendChild(renderBlock(ir, leftId));

	const label = document.createElement("span");
	label.textContent = operatorLabel(block.opcode);

	const right = document.createElement("span");
	right.className = "input";
	right.appendChild(renderBlock(ir, rightId));

	div.append(left, label, right);
	return div;
}

function renderUnknown(block) {
	const div = document.createElement("div");
	div.className = "block unknown";
	div.textContent = block.opcode;
	return div;
}
