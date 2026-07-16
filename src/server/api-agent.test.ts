import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { createWorkspaceSnapshot } from "@/modules/workspace/domain";
import type { ResearchGateway } from "@/server/agent/research-gateway";
import { createApi } from "@/server/api";
import {
	ObjectProviderConfigSource,
	ProviderCatalog,
} from "@/server/providers/catalog";

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3["doStream"]>>;
type MockStreamChunk = MockStreamResult["stream"] extends ReadableStream<
	infer T
>
	? T
	: never;

const usage = {
	inputTokens: {
		total: 10,
		noCache: 10,
		cacheRead: undefined,
		cacheWrite: undefined,
	},
	outputTokens: { total: 5, text: 5, reasoning: undefined },
};

function createAgentMockModel() {
	const responses: MockStreamChunk[][] = [
		[
			{
				type: "tool-call",
				toolCallId: "call-read",
				toolName: "read_file",
				input: JSON.stringify({ path: "/src/App.tsx" }),
			},
			{
				type: "finish",
				finishReason: { unified: "tool-calls", raw: undefined },
				usage,
			},
		],
		[
			{
				type: "tool-call",
				toolCallId: "call-write",
				toolName: "write_file",
				input: JSON.stringify({
					path: "/src/App.tsx",
					content: "export default () => <main>Done</main>;",
				}),
			},
			{
				type: "finish",
				finishReason: { unified: "tool-calls", raw: undefined },
				usage,
			},
		],
		[
			{
				type: "tool-call",
				toolCallId: "call-finalize",
				toolName: "finalize_changes",
				input: JSON.stringify({ summary: "Update the app" }),
			},
			{
				type: "finish",
				finishReason: { unified: "tool-calls", raw: undefined },
				usage,
			},
		],
	];
	let index = 0;
	const doStream = vi.fn(async () => {
		const chunks = responses[index++];
		if (!chunks) {
			throw new Error("Agent made an unexpected model call after finalization");
		}
		return {
			stream: simulateReadableStream({ chunks }),
		};
	});
	return {
		model: new MockLanguageModelV3({ doStream }),
		doStream,
	};
}

function waitFor<T>(promise: Promise<T>, timeoutMs = 2_000): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => {
			setTimeout(
				() => reject(new Error("Timed out waiting for abort")),
				timeoutMs,
			);
		}),
	]);
}

interface UiStreamEvent {
	type?: string;
	delta?: string;
	[key: string]: unknown;
}

function parseUiStreamEvents(streamText: string): UiStreamEvent[] {
	return streamText
		.split("\n")
		.filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
		.map((line) => JSON.parse(line.slice(6)) as UiStreamEvent);
}

function collectTextDeltas(events: UiStreamEvent[]): string {
	return events
		.filter(
			(event): event is UiStreamEvent & { delta: string } =>
				event.type === "text-delta" && typeof event.delta === "string",
		)
		.map((event) => event.delta)
		.join("");
}

describe("POST /api/chat", () => {
	it("streams web research sources before a research-only answer without finalizing", async () => {
		const { snapshot } = createWorkspaceSnapshot({ "/src/App.tsx": "old" });
		const responses: MockStreamChunk[][] = [
			[
				{
					type: "tool-call",
					toolCallId: "call-web-search",
					toolName: "web_search",
					input: JSON.stringify({
						query: "latest React release",
						maxResults: 5,
						topic: "general",
					}),
				},
				{
					type: "finish",
					finishReason: { unified: "tool-calls", raw: undefined },
					usage,
				},
			],
			[
				{ type: "text-start", id: "research-answer" },
				{
					type: "text-delta",
					id: "research-answer",
					delta:
						"React release details are available in the [official versions page](https://react.dev/versions).",
				},
				{ type: "text-end", id: "research-answer" },
				{
					type: "finish",
					finishReason: { unified: "stop", raw: undefined },
					usage,
				},
			],
		];
		let responseIndex = 0;
		const model = new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream({ chunks: responses[responseIndex++] }),
			}),
		});
		const researchGateway: ResearchGateway = {
			searchWeb: vi.fn(async () => ({
				query: "latest React release",
				sources: [
					{
						title: "React versions",
						url: "https://react.dev/versions",
						snippet: "Current React release information.",
					},
				],
			})),
			searchWeather: vi.fn(),
		};
		const api = createApi({
			providerCatalog: new ProviderCatalog(
				new ObjectProviderConfigSource({ OPENAI_API_KEY: "test-only" }),
			),
			modelResolver: () => model,
			researchGateway,
		});

		const response = await api.request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				messages: [
					{
						id: "user-research",
						role: "user",
						parts: [
							{ type: "text", text: "What is the latest React release?" },
						],
					},
				],
				providerId: "openai",
				modelId: "openai/gpt-5.4",
				workspace: snapshot,
			}),
		});
		const streamText = await response.text();
		const events = parseUiStreamEvents(streamText);
		const sourceIndex = events.findIndex((event) =>
			JSON.stringify(event).includes("React versions"),
		);
		const answerIndex = events.findIndex(
			(event, index) => index > sourceIndex && event.type === "text-start",
		);

		expect(response.status).toBe(200);
		expect(streamText).toContain("web_search");
		expect(sourceIndex).toBeGreaterThanOrEqual(0);
		expect(answerIndex).toBeGreaterThan(sourceIndex);
		expect(collectTextDeltas(events)).toContain("React release details");
		expect(streamText).not.toContain("finalize_changes");
		expect(researchGateway.searchWeb).toHaveBeenCalledWith(
			expect.objectContaining({ query: "latest React release" }),
			expect.any(AbortSignal),
		);
	});

	it("streams a real Mastra tool loop and a finalized ChangeSet without a provider key", async () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.tsx": "export default () => null;",
		});
		const mockModel = createAgentMockModel();
		const api = createApi({
			providerCatalog: new ProviderCatalog(
				new ObjectProviderConfigSource({ OPENAI_API_KEY: "test-only" }),
			),
			modelResolver: () => mockModel.model,
		});

		const response = await api.request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				messages: [
					{
						id: "user-1",
						role: "user",
						parts: [{ type: "text", text: "Update the app" }],
					},
				],
				providerId: "openai",
				modelId: "openai/gpt-5.4",
				workspace: snapshot,
			}),
		});
		const streamText = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
		expect(streamText).toContain("finalize_changes");
		expect(streamText).toContain("/src/App.tsx");
		expect(mockModel.doStream).toHaveBeenCalledTimes(3);
		expect(snapshot.files["/src/App.tsx"].content).toContain("null");
	});

	it("streams a recoverable incomplete-run error when the step budget is exhausted", async () => {
		const { snapshot } = createWorkspaceSnapshot({ "/src/App.tsx": "old" });
		let callIndex = 0;
		const doStream = vi.fn(async () => {
			callIndex += 1;
			return {
				stream: simulateReadableStream<MockStreamChunk>({
					chunks: [
						{
							type: "tool-call",
							toolCallId: `call-list-${callIndex}`,
							toolName: "list_files",
							input: "{}",
						},
						{
							type: "finish",
							finishReason: { unified: "tool-calls", raw: undefined },
							usage,
						},
					],
				}),
			};
		});
		const model = new MockLanguageModelV3({ doStream });
		const api = createApi({
			providerCatalog: new ProviderCatalog(
				new ObjectProviderConfigSource({ OPENAI_API_KEY: "test-only" }),
			),
			modelResolver: () => model,
		});

		const response = await api.request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				messages: [
					{
						id: "user-budget",
						role: "user",
						parts: [{ type: "text", text: "Keep inspecting forever" }],
					},
				],
				providerId: "openai",
				modelId: "openai/gpt-5.4",
				workspace: snapshot,
			}),
		});
		const streamText = await response.text();

		expect(response.status).toBe(200);
		expect(doStream).toHaveBeenCalledTimes(20);
		expect(streamText).toContain("Agent stopped after 20 steps");
		expect(streamText).toContain("Retry");
	});

	it("propagates client cancellation to the model execution", async () => {
		const { snapshot } = createWorkspaceSnapshot({ "/src/App.tsx": "old" });
		let markStarted: (() => void) | undefined;
		let markAborted: (() => void) | undefined;
		const started = new Promise<void>((resolve) => {
			markStarted = resolve;
		});
		const aborted = new Promise<void>((resolve) => {
			markAborted = resolve;
		});
		const model = new MockLanguageModelV3({
			doStream: async ({ abortSignal }) => ({
				stream: new ReadableStream<MockStreamChunk>({
					start(controller) {
						markStarted?.();
						controller.enqueue({ type: "text-start", id: "cancel-text" });
						abortSignal?.addEventListener(
							"abort",
							() => {
								markAborted?.();
								controller.close();
							},
							{ once: true },
						);
					},
				}),
			}),
		});
		const api = createApi({
			providerCatalog: new ProviderCatalog(
				new ObjectProviderConfigSource({ OPENAI_API_KEY: "test-only" }),
			),
			modelResolver: () => model,
		});
		const controller = new AbortController();
		const response = await api.request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			signal: controller.signal,
			body: JSON.stringify({
				messages: [
					{
						id: "user-cancel",
						role: "user",
						parts: [{ type: "text", text: "Wait" }],
					},
				],
				providerId: "openai",
				modelId: "openai/gpt-5.4",
				workspace: snapshot,
			}),
		});
		const consume = response.text().catch(() => "");

		await waitFor(started);
		controller.abort("client stopped");
		await waitFor(aborted);
		await consume;

		expect(controller.signal.aborted).toBe(true);
	});

	it("streams bounded tool errors without mutating the submitted workspace", async () => {
		const { snapshot } = createWorkspaceSnapshot({ "/src/App.tsx": "old" });
		const responses: MockStreamChunk[][] = [
			[
				{
					type: "tool-call",
					toolCallId: "call-unsafe-write",
					toolName: "write_file",
					input: JSON.stringify({
						path: "/src/App.tsx",
						content: "must not apply",
					}),
				},
				{
					type: "finish",
					finishReason: { unified: "tool-calls", raw: undefined },
					usage,
				},
			],
			[
				{ type: "text-start", id: "tool-error-text" },
				{
					type: "text-delta",
					id: "tool-error-text",
					delta: "The file must be inspected before editing.",
				},
				{ type: "text-end", id: "tool-error-text" },
				{
					type: "finish",
					finishReason: { unified: "stop", raw: undefined },
					usage,
				},
			],
		];
		let responseIndex = 0;
		const model = new MockLanguageModelV3({
			doStream: async () => ({
				stream: simulateReadableStream({ chunks: responses[responseIndex++] }),
			}),
		});
		const api = createApi({
			providerCatalog: new ProviderCatalog(
				new ObjectProviderConfigSource({ OPENAI_API_KEY: "test-only" }),
			),
			modelResolver: () => model,
		});

		const response = await api.request("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				messages: [
					{
						id: "user-tool-error",
						role: "user",
						parts: [{ type: "text", text: "Edit without reading" }],
					},
				],
				providerId: "openai",
				modelId: "openai/gpt-5.4",
				workspace: snapshot,
			}),
		});
		const streamText = await response.text();
		const events = parseUiStreamEvents(streamText);

		expect(response.status).toBe(200);
		expect(streamText).toContain("write_file");
		expect(streamText).toContain("output-error");
		expect(collectTextDeltas(events)).toContain("inspected before editing");
		expect(snapshot.files["/src/App.tsx"].content).toBe("old");
	});
});
