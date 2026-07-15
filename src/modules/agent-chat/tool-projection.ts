import { isToolOrDynamicToolUIPart, type ToolUIPart, type UIMessage } from "ai";
import {
	type CompletedAgentToolResult,
	useAgentChangeSessionStore,
} from "@/modules/agent-chat/change-session";

export function projectCompletedAgentTools(
	messages: UIMessage[],
	processedToolCallIds: Set<string>,
	runId: string | null,
): string | null {
	if (!runId || useAgentChangeSessionStore.getState().runId !== runId) {
		return null;
	}
	let openedPath: string | null = null;

	for (const message of messages) {
		for (const part of message.parts) {
			if (
				!isToolOrDynamicToolUIPart(part) ||
				part.state !== "output-available" ||
				part.preliminary === true ||
				processedToolCallIds.has(part.toolCallId)
			) {
				continue;
			}
			processedToolCallIds.add(part.toolCallId);
			const result = useAgentChangeSessionStore
				.getState()
				.projectToolResult(toCompletedToolResult(part));
			if (!result.accepted) continue;
			openedPath ??= result.openedPath ?? null;
		}
	}

	return openedPath;
}

function toCompletedToolResult(
	part: Extract<UIMessage["parts"][number], { toolCallId: string }>,
): CompletedAgentToolResult {
	return {
		toolName:
			part.type === "dynamic-tool"
				? part.toolName
				: (part.type as ToolUIPart["type"]).split("-").slice(1).join("-"),
		input: part.input,
		output: part.output,
	};
}
