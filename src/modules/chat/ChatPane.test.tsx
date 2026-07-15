import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	createUIMessageStreamResponse,
	type UIMessage,
	type UIMessageChunk,
} from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentChangeSessionStore } from "@/modules/agent-chat/change-session";
import { AgentChatMessage, ChatPane } from "@/modules/chat/ChatPane";
import { EditorPane } from "@/modules/editor/EditorPane";
import { useEditor } from "@/modules/editor/store";
import { useFs } from "@/modules/fs/store";
import { TOUR_STEP_IDS } from "@/modules/tour/constants";
import {
	browserWorkspace,
	useBrowserWorkspaceFiles,
} from "@/modules/workspace/browser";
import { hashText } from "@/modules/workspace/domain";

vi.mock("@/modules/fs/persistence", () => ({
	clearWorkspace: vi.fn().mockResolvedValue(undefined),
	loadWorkspace: vi.fn().mockResolvedValue(null),
	saveWorkspace: vi.fn().mockResolvedValue(undefined),
	scheduleWorkspaceSave: vi.fn(),
}));

vi.mock("@/modules/editor/EditorDiffView", () => ({
	EditorDiffView: ({
		originalContent,
		modifiedContent,
		inline,
	}: {
		originalContent: string;
		modifiedContent: string;
		inline?: boolean;
	}) => (
		<output
			data-inline={String(inline)}
			data-modified={modifiedContent}
			data-original={originalContent}
			data-testid="streamed-agent-diff"
		/>
	),
}));

vi.mock("@/modules/editor/MonacoEditor", () => ({
	MonacoEditorWrapper: ({ value }: { value: string }) => (
		<output data-testid="streamed-code-editor">{value}</output>
	),
}));

beforeEach(async () => {
	await useFs.getState().resetFs();
	useEditor.getState().closeAllFiles();
	useAgentChangeSessionStore.getState().clear();
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

function configuredProviderCatalogResponse() {
	return Response.json({
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
	});
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
		expect(
			screen.getByRole("heading", {
				name: "Build with a real coding agent",
			}),
		).toBeVisible();
		expect(screen.getByText("Try a starter")).toBeVisible();
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

	it("projects a streamed write immediately and applies it only after approval", async () => {
		const user = userEvent.setup();
		const path = "/src/App.js";
		const before = useFs.getState().filesByPath[path].content;
		const after = before.replace("Hello React", "Live Agent Draft");
		const { snapshot } = await browserWorkspace.getSnapshot();
		let streamController:
			| ReadableStreamDefaultController<UIMessageChunk>
			| undefined;
		const stream = new ReadableStream<UIMessageChunk>({
			start(controller) {
				streamController = controller;
			},
		});
		vi.stubGlobal(
			"fetch",
			vi.fn((input: string | URL | Request) => {
				const url =
					typeof input === "string"
						? input
						: input instanceof URL
							? input.href
							: input.url;
				if (url.endsWith("/api/providers")) {
					return Promise.resolve(configuredProviderCatalogResponse());
				}
				return Promise.resolve(createUIMessageStreamResponse({ stream }));
			}),
		);

		render(
			<>
				<ChatPane />
				<EditorPane />
				<WorkspacePreviewProbe />
			</>,
		);
		const input = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(input, "Update the heading");
		await user.click(screen.getByRole("button", { name: "Submit" }));

		act(() => {
			streamController?.enqueue({
				type: "start",
				messageId: "assistant-live-draft",
			});
			streamController?.enqueue({ type: "start-step" });
			streamController?.enqueue({
				type: "tool-input-available",
				toolCallId: "write-live-draft",
				toolName: "write_file",
				input: { path, content: after },
				dynamic: true,
			});
			streamController?.enqueue({
				type: "tool-output-available",
				toolCallId: "write-live-draft",
				output: {
					path,
					hash: hashText(after),
					bytes: new TextEncoder().encode(after).byteLength,
				},
				dynamic: true,
			});
		});

		await waitFor(() => {
			const diff = screen.getByTestId("streamed-agent-diff");
			expect(diff).toHaveAttribute("data-inline", "true");
			expect(diff).toHaveAttribute("data-original", before);
			expect(diff).toHaveAttribute("data-modified", after);
		});
		expect(screen.getByTestId("workspace-preview")).toHaveTextContent(
			"Hello React",
		);
		expect(useEditor.getState().activeFilePath).toBe(path);

		act(() => {
			streamController?.enqueue({
				type: "tool-input-available",
				toolCallId: "finalize-live-draft",
				toolName: "finalize_changes",
				input: { summary: "Update the heading" },
				dynamic: true,
			});
			streamController?.enqueue({
				type: "tool-output-available",
				toolCallId: "finalize-live-draft",
				output: {
					id: "agent:live-draft",
					baseRevision: snapshot.revision,
					summary: "Update the heading",
					changes: [
						{
							op: "update",
							path,
							beforeHash: snapshot.files[path].hash,
							content: after,
						},
					],
				},
				dynamic: true,
			});
			streamController?.enqueue({ type: "finish-step" });
			streamController?.enqueue({ type: "finish", finishReason: "stop" });
			streamController?.close();
		});

		await user.click(
			await screen.findByRole("button", { name: "Apply selected" }),
		);
		await waitFor(() =>
			expect(screen.getByTestId("workspace-preview")).toHaveTextContent(
				"Live Agent Draft",
			),
		);
	});

	it("aborts the active chat request when Escape is pressed after sending", async () => {
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
					return Promise.resolve(configuredProviderCatalogResponse());
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
		expect(screen.getByRole("button", { name: "Submit" })).toHaveClass(
			"bg-blue-600",
		);
		expect(
			document.querySelectorAll('[data-slot="agent-chat-composer"]'),
		).toHaveLength(1);
		await user.type(input, "Update the app");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		expect(
			screen.queryByRole("heading", {
				name: "Build with a real coding agent",
			}),
		).not.toBeInTheDocument();
		expect(
			document.querySelectorAll('[data-slot="agent-chat-composer"]'),
		).toHaveLength(1);
		await waitFor(() =>
			expect(useAgentChangeSessionStore.getState().phase).toBe("running"),
		);
		expect(await screen.findByText("/.npmrc")).toBeVisible();
		expect(screen.getByText(/credential or secret path/i)).toBeVisible();
		expect(screen.queryByText(/must-not-render/)).toBeNull();
		expect(await screen.findByRole("button", { name: "Stop" })).toBeVisible();
		await user.keyboard("{Escape}");

		await waitFor(() => expect(chatSignal?.aborted).toBe(true));
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Submit" })).toHaveClass(
				"bg-blue-600",
			),
		);
		expect(useAgentChangeSessionStore.getState().phase).toBe("idle");
	});

	it("aborts the active chat request when the editor discards all drafts", async () => {
		const user = userEvent.setup();
		let chatSignal: AbortSignal | undefined;
		vi.stubGlobal(
			"fetch",
			vi.fn((input: string | URL | Request, init?: RequestInit) => {
				const url =
					typeof input === "string"
						? input
						: input instanceof URL
							? input.href
							: input.url;
				if (url.endsWith("/api/providers")) {
					return Promise.resolve(configuredProviderCatalogResponse());
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
			}),
		);

		render(<ChatPane />);
		const input = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(input, "Update the app");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await waitFor(() =>
			expect(useAgentChangeSessionStore.getState().phase).toBe("running"),
		);

		act(() => {
			useAgentChangeSessionStore.getState().requestDiscardAll();
		});

		await waitFor(() => expect(chatSignal?.aborted).toBe(true));
		expect(useAgentChangeSessionStore.getState()).toMatchObject({
			phase: "idle",
			discardAllRequested: false,
		});
	});
});
