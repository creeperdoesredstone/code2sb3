import { variables } from "./blocks.js";

function buildProjectJson(ir) {
	const project = {
		version: 3,
		meta: {
			semver: "3.0.0",
			vm: "12.1.3",
			agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
		},
		broadcasts: {},
		monitors: [],
		extensions: [],
		targets: [
			{
				isStage: true,
				name: "Stage",
				variables: variables,
				lists: {},
				broadcasts: {},
				blocks: ir,
				comments: {},
				currentCostume: 0,
				costumes: [
					{
						bitmapResolution: 1,
						assetId: "cd21514d0531fdffb22204e0ec5ed84a",
						name: "backdrop1",
						md5ext: "cd21514d0531fdffb22204e0ec5ed84a.svg",
						dataFormat: "svg",
						rotationCenterX: 240,
						rotationCenterY: 180,
					},
				],
				sounds: [],
				volume: 100,
				layerOrder: 0,
				tempo: 60,
				videoTransparency: 50,
				videoState: "on",
				videoDevice: null,
				textToSpeechLanguage: null,
			},
		],
	};

	console.log(project);
	return project;
}

const STAGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360">
  <rect width="480" height="360" fill="white"/>
</svg>
`.trim();

async function exportSB3() {
	const zip = new JSZip();
	const ir = JSON.parse(sessionStorage.getItem("blocks") || "{}");
	Object.keys(ir).forEach((k) => (ir[k].value ? delete ir[k] : ir[k]));
	const projectJson = buildProjectJson(ir);

	const assetId = "cd21514d0531fdffb22204e0ec5ed84a";
	const filename = `${assetId}.svg`;

	zip.file("project.json", JSON.stringify(projectJson, null, 2));
	zip.file(filename, STAGE_SVG);

	const blob = await zip.generateAsync({ type: "blob" });

	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download =
		(document.getElementById("inp-project-name").value || "New Project") +
		".sb3";
	a.click();

	URL.revokeObjectURL(a.href);
}

document.getElementById("btn-export").addEventListener("click", exportSB3);
