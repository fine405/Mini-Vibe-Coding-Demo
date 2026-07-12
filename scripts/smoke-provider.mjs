const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const providersResponse = await fetch(`${baseUrl}/api/providers`, {
	headers: { accept: "application/json" },
	signal: AbortSignal.timeout(10_000),
});
if (!providersResponse.ok) {
	throw new Error(
		`Provider catalog request failed with ${providersResponse.status}`,
	);
}

const { providers } = await providersResponse.json();
const requestedProviderId = process.env.SMOKE_PROVIDER_ID;
const provider = requestedProviderId
	? providers.find((candidate) => candidate.id === requestedProviderId)
	: providers.find((candidate) => candidate.configured);
if (!provider) {
	throw new Error("No configured Provider is available for the smoke test");
}
if (!provider.configured) {
	throw new Error(`${provider.name} is not configured on the running server`);
}

const modelId = process.env.SMOKE_MODEL_ID ?? provider.defaultModelId;
if (!provider.models.some((model) => model.id === modelId)) {
	throw new Error(`${modelId} is not allowlisted for ${provider.name}`);
}

const files = {
	"/src/App.js":
		"export default function App() { return <main>smoke</main>; }\n",
};
const snapshot = {
	revision: computeRevision(files),
	files: Object.fromEntries(
		Object.entries(files).map(([path, content]) => [
			path,
			{ content, hash: hashText(content) },
		]),
	),
};

const chatResponse = await fetch(`${baseUrl}/api/chat`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({
		messages: [
			{
				id: `smoke-${Date.now()}`,
				role: "user",
				parts: [
					{
						type: "text",
						text: "Read /src/App.js, change smoke to smoke-ready, and finalize the changes for review.",
					},
				],
			},
		],
		providerId: provider.id,
		modelId,
		workspace: snapshot,
	}),
	signal: AbortSignal.timeout(120_000),
});
const streamText = await chatResponse.text();
if (!chatResponse.ok) {
	throw new Error(
		`Agent smoke request failed with ${chatResponse.status}: ${streamText.slice(0, 500)}`,
	);
}
if (!streamText.includes("finalize_changes")) {
	throw new Error(
		"Agent stream completed without a finalize_changes tool result",
	);
}

console.log(
	JSON.stringify({
		ok: true,
		providerId: provider.id,
		modelId,
		streamBytes: new TextEncoder().encode(streamText).byteLength,
	}),
);

function computeRevision(workspaceFiles) {
	const manifest = Object.keys(workspaceFiles)
		.sort()
		.map((path) => `${path}\0${hashText(workspaceFiles[path])}`)
		.join("\0");
	return hashText(manifest);
}

function hashText(content) {
	let hash = 0xcbf29ce484222325n;
	for (const byte of new TextEncoder().encode(content)) {
		hash ^= BigInt(byte);
		hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
	}
	return `fnv1a64:${hash.toString(16).padStart(16, "0")}`;
}
