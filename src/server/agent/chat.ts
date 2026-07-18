import "@tanstack/react-start/server-only";
import { pipeJsonRender } from "@json-render/core";
import { handleChatStream } from "@mastra/ai-sdk";
import type { MastraModelConfig } from "@mastra/core/llm";
import { RequestContext } from "@mastra/core/request-context";
import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { z } from "zod";
import { ephemeralCredentialsSchema } from "@/modules/agent-chat/ephemeral-credentials";
import { workspaceSnapshotSchema } from "@/modules/workspace/schema";
import {
	AGENT_MAX_STEPS,
	type CodingRequestContext,
	stopAfterFinalize,
} from "@/server/agent/coding-agent";
import { mastra } from "@/server/agent/mastra";
import type { ResearchGateway } from "@/server/agent/research-gateway";
import { RunWorkspace, RunWorkspaceError } from "@/server/agent/run-workspace";
import type {
	ProviderCatalog,
	ResolvedProviderModel,
} from "@/server/providers/catalog";
import { ProviderCatalogError } from "@/server/providers/catalog";

const uiMessageSchema = z
	.object({
		id: z.string().min(1),
		role: z.enum(["system", "user", "assistant"]),
		parts: z.array(z.object({ type: z.string() }).passthrough()),
	})
	.passthrough();

const chatRequestSchema = z.object({
	messages: z.array(uiMessageSchema).min(1),
	trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
	messageId: z.string().optional(),
	providerId: z.string().min(1),
	modelId: z.string().min(1),
	workspace: workspaceSnapshotSchema,
	ephemeralCredentials: ephemeralCredentialsSchema.optional(),
});

export type ChatModelResolver = (
	resolved: ResolvedProviderModel,
) => MastraModelConfig;

export interface ChatDependencies {
	providerCatalog: ProviderCatalog;
	modelResolver?: ChatModelResolver;
	researchGateway: ResearchGateway;
	researchGatewayForTavilyKey?: (apiKey: string) => ResearchGateway;
}

type MastraV6ChatOptions = Parameters<typeof handleChatStream>[0];
type MastraV6Message = MastraV6ChatOptions["params"]["messages"][number];

function toMastraV6Messages(
	messages: z.infer<typeof uiMessageSchema>[],
): MastraV6Message[] {
	// @mastra/ai-sdk vendors the v6 UI types. The payload is structurally the
	// same protocol and was validated above, but TypeScript treats the vendored
	// and direct `ai` package declarations as unrelated identities.
	return messages as unknown as MastraV6Message[];
}

function toCurrentAiStream(
	stream: Awaited<ReturnType<typeof handleChatStream>>,
): ReadableStream<UIMessageChunk> {
	// Keep the upstream duplicate-type compatibility bridge at this one tested
	// protocol boundary. No runtime conversion is necessary for UI v6 chunks.
	return stream as unknown as ReadableStream<UIMessageChunk>;
}

function withIncompleteRunState(
	stream: ReadableStream<UIMessageChunk>,
	isIncomplete: () => boolean,
): ReadableStream<UIMessageChunk> {
	let finishChunk: UIMessageChunk | undefined;
	return stream.pipeThrough(
		new TransformStream<UIMessageChunk, UIMessageChunk>({
			transform(chunk, controller) {
				if (chunk.type === "finish") finishChunk = chunk;
				else controller.enqueue(chunk);
			},
			flush(controller) {
				if (isIncomplete()) {
					controller.enqueue({
						type: "error",
						errorText: `Agent stopped after ${AGENT_MAX_STEPS} steps without finalizing changes. Retry to continue from the current workspace.`,
					});
					return;
				}
				if (finishChunk) controller.enqueue(finishChunk);
			},
		}),
	);
}

export async function createChatResponse(
	request: Request,
	requestId: string,
	dependencies: ChatDependencies,
): Promise<Response> {
	let input: unknown;
	try {
		input = await request.json();
	} catch {
		return Response.json(
			{
				error: {
					code: "INVALID_JSON",
					message: "Request body must be valid JSON",
				},
			},
			{ status: 400 },
		);
	}

	const parsed = chatRequestSchema.safeParse(input);
	if (!parsed.success) {
		return Response.json(
			{
				error: {
					code: "INVALID_REQUEST",
					message: "Chat request failed validation",
					issues: parsed.error.issues.map((issue) => ({
						path: issue.path.join("."),
						message: issue.message,
					})),
				},
			},
			{ status: 400 },
		);
	}

	try {
		const credentials = parsed.data.ephemeralCredentials;
		const researchGateway =
			credentials?.tavilyApiKey && dependencies.researchGatewayForTavilyKey
				? dependencies.researchGatewayForTavilyKey(credentials.tavilyApiKey)
				: dependencies.researchGateway;
		const resolved = dependencies.providerCatalog.resolve(
			{
				providerId: parsed.data.providerId,
				modelId: parsed.data.modelId,
			},
			{ deepseekApiKey: credentials?.deepseekApiKey },
		);
		const runWorkspace = new RunWorkspace(parsed.data.workspace);
		const requestContext = new RequestContext<CodingRequestContext>();
		requestContext.set(
			"model",
			dependencies.modelResolver?.(resolved) ?? resolved.mastraModel,
		);
		requestContext.set("runWorkspace", runWorkspace);
		requestContext.set("researchGateway", researchGateway);
		requestContext.set("requestId", requestId);
		const abortSignal = AbortSignal.any([
			request.signal,
			AbortSignal.timeout(10 * 60_000),
		]);
		const startedAt = performance.now();
		let incompleteRun = false;
		console.info(
			JSON.stringify({
				event: "agent.run.started",
				requestId,
				providerId: resolved.providerId,
				modelId: resolved.modelId,
			}),
		);

		const stream = await handleChatStream({
			mastra,
			agentId: "codingAgent",
			version: "v6",
			params: {
				messages: toMastraV6Messages(parsed.data.messages),
				trigger: parsed.data.trigger,
				requestContext,
				abortSignal,
			},
			defaultOptions: {
				maxSteps: AGENT_MAX_STEPS,
				stopWhen: stopAfterFinalize,
				onFinish: (event) => {
					incompleteRun =
						event.finishReason === "tool-calls" &&
						event.steps.length >= AGENT_MAX_STEPS &&
						!runWorkspace.finalized;
					console.info(
						JSON.stringify({
							event: "agent.run.finished",
							requestId,
							providerId: resolved.providerId,
							modelId: resolved.modelId,
							durationMs: Math.round(performance.now() - startedAt),
							finishReason: event.finishReason,
							steps: event.steps.length,
							incomplete: incompleteRun,
							usage: event.totalUsage,
						}),
					);
				},
				onAbort: () => {
					console.info(
						JSON.stringify({
							event: "agent.run.aborted",
							requestId,
							providerId: resolved.providerId,
							modelId: resolved.modelId,
							durationMs: Math.round(performance.now() - startedAt),
						}),
					);
				},
			},
			sendReasoning: true,
			onError: (error) => {
				console.error(
					JSON.stringify({
						event: "agent.run.stream_error",
						requestId,
						providerId: resolved.providerId,
						modelId: resolved.modelId,
						durationMs: Math.round(performance.now() - startedAt),
						errorCategory: "AGENT_STREAM_ERROR",
						errorName: error instanceof Error ? error.name : typeof error,
					}),
				);
				return "Agent execution failed. Check server logs with the request ID.";
			},
			messageMetadata: () => ({ requestId }),
		});

		return createUIMessageStreamResponse({
			stream: withIncompleteRunState(
				pipeJsonRender(toCurrentAiStream(stream)),
				() => incompleteRun,
			),
		});
	} catch (error) {
		if (error instanceof ProviderCatalogError) {
			return Response.json(
				{ error: { code: error.code, message: error.message } },
				{ status: error.code === "PROVIDER_NOT_CONFIGURED" ? 503 : 400 },
			);
		}
		if (error instanceof RunWorkspaceError) {
			return Response.json(
				{ error: { code: error.code, message: error.message } },
				{ status: 400 },
			);
		}
		console.error(
			JSON.stringify({
				event: "agent.run.failed",
				requestId,
				errorCategory: "AGENT_START_FAILED",
			}),
		);
		return Response.json(
			{
				error: {
					code: "AGENT_START_FAILED",
					message: "Agent execution could not be started",
				},
			},
			{ status: 500 },
		);
	}
}
