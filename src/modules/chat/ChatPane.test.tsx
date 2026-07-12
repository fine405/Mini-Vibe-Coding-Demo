import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentChatMessage, ChatPane } from "@/modules/chat/ChatPane";
import { useFs } from "@/modules/fs/store";
import { TOUR_STEP_IDS } from "@/modules/tour/constants";
import {
	browserWorkspace,
	useBrowserWorkspaceFiles,
} from "@/modules/workspace/browser";

vi.mock("@/modules/fs/persistence", () => ({
	clearWorkspace: vi.fn().mockResolvedValue(undefined),
	loadWorkspace: vi.fn().mockResolvedValue(null),
	saveWorkspace: vi.fn().mockResolvedValue(undefined),
	scheduleWorkspaceSave: vi.fn(),
}));

beforeEach(async () => {
	await useFs.getState().resetFs();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function WorkspacePreviewProbe() {
	const files = useBrowserWorkspaceFiles();
	return (
		<output data-testid="workspace-preview">
			{files["/src/App.js"]?.content}
		</output>
	);
}

describe("AgentChatMessage", () => {
	it("exposes the chat pane as the first tour target", () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => new Promise<Response>(() => {})),
		);
		render(<ChatPane />);

		expect(
			screen.getByRole("region", { name: "Coding agent" }),
		).toHaveAttribute("id", TOUR_STEP_IDS.CHAT_PANE);
	});

	it("renders streamed model text and reasoning with AI Elements", async () => {
		const message = {
			id: "assistant-1",
			role: "assistant",
			parts: [
				{ type: "reasoning", text: "I inspected the workspace first." },
				{ type: "text", text: "**Ready** for review." },
			],
		} as UIMessage;

		render(<AgentChatMessage isStreaming={false} message={message} />);

		expect(await screen.findByText("Ready")).toBeVisible();
		expect(screen.getByText("Thought for a few seconds")).toBeVisible();
	});

	it("renders typed tool errors with AI Elements", () => {
		const message = {
			id: "assistant-tool-error",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "read_file",
					toolCallId: "call-read-error",
					state: "output-error",
					input: { path: "/missing.ts" },
					errorText: "File not found",
				},
			],
		} as UIMessage;

		render(<AgentChatMessage isStreaming={false} message={message} />);

		expect(screen.getByText("read file")).toBeVisible();
		expect(screen.getByText("File not found")).toBeVisible();
	});

	it("renders finalize_changes before its input is available", () => {
		const message = {
			id: "assistant-tool-streaming",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "finalize_changes",
					toolCallId: "call-finalize-streaming",
					state: "input-streaming",
					input: undefined,
				},
			],
		} as unknown as UIMessage;

		expect(() =>
			render(<AgentChatMessage isStreaming={true} message={message} />),
		).not.toThrow();
		expect(screen.getByText("Pending")).toBeVisible();
	});

	it("hands a finalized tool result through review into preview workspace state", async () => {
		const user = userEvent.setup();
		const before = useFs.getState().filesByPath["/src/App.js"].content;
		const { snapshot } = await browserWorkspace.getSnapshot();
		const after = before.replace("Hello React", "Browser Flow Complete");
		const message = {
			id: "assistant-finalize",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "finalize_changes",
					toolCallId: "call-finalize-browser",
					state: "output-available",
					input: { summary: "Complete browser flow" },
					output: {
						id: "agent:browser-flow",
						baseRevision: snapshot.revision,
						summary: "Complete browser flow",
						changes: [
							{
								op: "update",
								path: "/src/App.js",
								beforeHash: snapshot.files["/src/App.js"].hash,
								content: after,
							},
						],
					},
				},
			],
		} as UIMessage;

		render(
			<>
				<AgentChatMessage isStreaming={false} message={message} />
				<WorkspacePreviewProbe />
			</>,
		);
		expect(screen.getByTestId("workspace-preview")).toHaveTextContent(
			"Hello React",
		);
		await user.click(
			await screen.findByRole("button", { name: "Apply selected" }),
		);

		await waitFor(() =>
			expect(screen.getByTestId("workspace-preview")).toHaveTextContent(
				"Browser Flow Complete",
			),
		);
	});

	it("aborts the active chat request when Stop is clicked", async () => {
		const user = userEvent.setup();
		useFs
			.getState()
			.createFile(
				"/.npmrc",
				"//registry.npmjs.org/:_authToken=must-not-render",
			);
		let chatSignal: AbortSignal | undefined;
		const fetchMock = vi.fn(
			(input: string | URL | Request, init?: RequestInit) => {
				const url =
					typeof input === "string"
						? input
						: input instanceof URL
							? input.href
							: input.url;
				if (url.endsWith("/api/providers")) {
					return Promise.resolve(
						Response.json({
							providers: [
								{
									id: "openai",
									name: "OpenAI",
									description: "OpenAI models",
									configured: true,
									missingEnvVars: [],
									defaultModelId: "openai/gpt-5.4",
									models: [
										{
											id: "openai/gpt-5.4",
											label: "GPT-5.4",
											description: "Default",
										},
									],
								},
							],
						}),
					);
				}

				chatSignal =
					init?.signal ??
					(input instanceof Request ? input.signal : null) ??
					undefined;
				return new Promise<Response>((_resolve, reject) => {
					const abort = () => reject(new DOMException("Stopped", "AbortError"));
					if (chatSignal?.aborted) abort();
					else chatSignal?.addEventListener("abort", abort, { once: true });
				});
			},
		);
		vi.stubGlobal("fetch", fetchMock);

		render(<ChatPane />);
		const input = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(input, "Update the app");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		expect(await screen.findByText("/.npmrc")).toBeVisible();
		expect(screen.getByText(/credential or secret path/i)).toBeVisible();
		expect(screen.queryByText(/must-not-render/)).toBeNull();
		const stop = await screen.findByRole("button", { name: "Stop" });
		await user.click(stop);

		await waitFor(() => expect(chatSignal?.aborted).toBe(true));
	});
});
