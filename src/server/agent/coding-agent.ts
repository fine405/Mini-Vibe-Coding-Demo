import "@tanstack/react-start/server-only";
import { Agent } from "@mastra/core/agent";
import type { MastraModelConfig } from "@mastra/core/llm";
import { hasToolCall } from "ai";
import { CODING_AGENT_INSTRUCTIONS } from "@/server/agent/instructions";
import type { RunWorkspace } from "@/server/agent/run-workspace";
import { codingTools } from "@/server/agent/tools";

export interface CodingRequestContext {
	model: MastraModelConfig;
	runWorkspace: RunWorkspace;
	requestId: string;
}

export const AGENT_MAX_STEPS = 12;
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
		"Inspects and edits an isolated browser workspace, then proposes a reviewable ChangeSet.",
	instructions: CODING_AGENT_INSTRUCTIONS,
	model: ({ requestContext }) => requestContext.get("model"),
	tools: codingTools,
	maxRetries: 1,
	defaultOptions: {
		maxSteps: AGENT_MAX_STEPS,
		stopWhen: stopAfterFinalize,
	},
});
