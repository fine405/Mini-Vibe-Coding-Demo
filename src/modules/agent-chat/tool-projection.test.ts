import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it } from "vitest";
import { useAgentChangeSessionStore } from "@/modules/agent-chat/change-session";
import { projectCompletedAgentTools } from "@/modules/agent-chat/tool-projection";
import { createWorkspaceSnapshot, hashText } from "@/modules/workspace/domain";

function activeRunId(): string {
	const runId = useAgentChangeSessionStore.getState().runId;
	if (!runId) throw new Error("Expected an active Agent run");
	return runId;
}

describe("Agent tool projection", () => {
	beforeEach(() => {
		useAgentChangeSessionStore.getState().clear();
	});

	it("projects a completed tool call once", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.ts": "before\n",
		});
		useAgentChangeSessionStore.getState().begin(snapshot);
		const message = {
			id: "assistant-1",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "write_file",
					toolCallId: "write-once",
					state: "output-available",
					input: { path: "/src/App.ts", content: "after\n" },
					output: {
						path: "/src/App.ts",
						hash: hashText("after\n"),
						bytes: 6,
					},
				},
			],
		} as UIMessage;
		const processed = new Set<string>();
		const runId = activeRunId();

		const first = projectCompletedAgentTools([message], processed, runId);
		const second = projectCompletedAgentTools([message], processed, runId);

		expect(first).toBe("/src/App.ts");
		expect(second).toBeNull();
		expect(processed).toEqual(new Set(["write-once"]));
	});

	it("ignores incomplete and failed mutation tool calls", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.ts": "before\n",
		});
		useAgentChangeSessionStore.getState().begin(snapshot);
		const message = {
			id: "assistant-incomplete",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "write_file",
					toolCallId: "write-streaming",
					state: "input-streaming",
					input: { path: "/src/App.ts", content: "streaming\n" },
				},
				{
					type: "dynamic-tool",
					toolName: "delete_file",
					toolCallId: "delete-error",
					state: "output-error",
					input: { path: "/src/App.ts" },
					errorText: "Delete failed",
				},
			],
		} as unknown as UIMessage;

		const result = projectCompletedAgentTools(
			[message],
			new Set(),
			activeRunId(),
		);

		expect(result).toBeNull();
		expect(useAgentChangeSessionStore.getState().changesByPath).toEqual({});
	});

	it("waits for a final tool output instead of projecting a preliminary one", () => {
		const { snapshot } = createWorkspaceSnapshot({
			"/src/App.ts": "before\n",
		});
		useAgentChangeSessionStore.getState().begin(snapshot);
		const toolPart = {
			type: "dynamic-tool",
			toolName: "write_file",
			toolCallId: "write-preliminary",
			state: "output-available",
			input: { path: "/src/App.ts", content: "after\n" },
			output: {
				path: "/src/App.ts",
				hash: hashText("after\n"),
				bytes: 6,
			},
		};
		const processed = new Set<string>();
		const runId = activeRunId();

		const preliminary = projectCompletedAgentTools(
			[
				{
					id: "assistant-preliminary",
					role: "assistant",
					parts: [{ ...toolPart, preliminary: true }],
				} as UIMessage,
			],
			processed,
			runId,
		);
		const final = projectCompletedAgentTools(
			[
				{
					id: "assistant-preliminary",
					role: "assistant",
					parts: [toolPart],
				} as UIMessage,
			],
			processed,
			runId,
		);

		expect(preliminary).toBeNull();
		expect(final).toBe("/src/App.ts");
	});

	it("rejects late tool output from an older run", () => {
		const first = createWorkspaceSnapshot({ "/src/App.ts": "first\n" });
		const second = createWorkspaceSnapshot({ "/src/App.ts": "second\n" });
		useAgentChangeSessionStore.getState().begin(first.snapshot);
		const staleRunId = activeRunId();
		useAgentChangeSessionStore.getState().begin(second.snapshot);
		const message = {
			id: "assistant-stale",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "write_file",
					toolCallId: "write-stale",
					state: "output-available",
					input: { path: "/src/App.ts", content: "stale\n" },
					output: {
						path: "/src/App.ts",
						hash: hashText("stale\n"),
						bytes: 6,
					},
				},
			],
		} as UIMessage;

		const result = projectCompletedAgentTools([message], new Set(), staleRunId);

		expect(result).toBeNull();
		expect(useAgentChangeSessionStore.getState().changesByPath).toEqual({});
	});
});
