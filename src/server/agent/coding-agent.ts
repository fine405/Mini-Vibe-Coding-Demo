import "@tanstack/react-start/server-only";
import { Agent } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import { hasToolCall } from "ai";
import { createGenerativeUiInstructions } from "@/modules/generative-ui/catalog";
import { CODING_AGENT_INSTRUCTIONS } from "@/server/agent/instructions";
import type { ResearchGateway } from "@/server/agent/research-gateway";
import type { RunWorkspace } from "@/server/agent/run-workspace";
import { codingTools } from "@/server/agent/tools";

export interface CodingRequestContext {
	model: MastraModelConfig;
	runWorkspace: RunWorkspace;
	researchGateway: ResearchGateway;
	requestId: string;
}

export const AGENT_MAX_STEPS = 20;
export const stopAfterFinalize = hasToolCall("finalize_changes");

export const codingAgent = new Agent<
	"codingAgent",
	typeof codingTools,
	undefined,
	CodingRequestContext
>({
	id: "codingAgent",
	name: "Mini Lovable Coding Agent",
	description:
		"Inspects and edits an isolated browser workspace or performs bounded read-only research with cited sources.",
	instructions: `${CODING_AGENT_INSTRUCTIONS}\n\n${createGenerativeUiInstructions()}`,
	model: ({ requestContext }) => requestContext.get("model"),
	tools: codingTools,
	maxRetries: 1,
	defaultOptions: {
		maxSteps: AGENT_MAX_STEPS,
		stopWhen: stopAfterFinalize,
	},
});
