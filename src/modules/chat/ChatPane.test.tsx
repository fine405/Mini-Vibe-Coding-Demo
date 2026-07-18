import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	createUIMessageStreamResponse,
	type UIMessage,
	type UIMessageChunk,
} from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentChangeSessionStore } from "@/modules/agent-chat/change-session";
import { AgentChatMessage, ChatPane } from "@/modules/chat/ChatPane";
import {
	GENERATIVE_UI_SUGGESTIONS,
	STARTER_SUGGESTIONS,
} from "@/modules/chat/suggestion-prompts";
import { EditorPane } from "@/modules/editor/EditorPane";
import { useEditor } from "@/modules/editor/store";
import { exportProjectAsJSON } from "@/modules/fs/export";
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

vi.mock("@/modules/generative-ui/GenerativeUIMessage", () => ({
	GenerativeUIMessage: ({ parts }: { parts: Array<{ type: string }> }) => (
		<output data-testid="generated-interface">
			{parts.filter((part) => part.type === "data-spec").length} spec parts
		</output>
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

function configuredProviderCatalogResponse(
	hostedChat = { enabled: true, tavilyConfigured: false },
) {
	return Response.json({
		hostedChat,
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

function unconfiguredDeepseekProviderCatalogResponse() {
	return Response.json({
		hostedChat: { enabled: true, tavilyConfigured: false },
		providers: [
			{
				id: "deepseek",
				name: "DeepSeek",
				description: "DeepSeek models",
				configured: false,
				missingEnvVars: ["DEEPSEEK_API_KEY"],
				defaultModelId: "deepseek/deepseek-chat",
				models: [
					{
						id: "deepseek/deepseek-chat",
						label: "DeepSeek Chat",
						description: "Default",
					},
				],
			},
		],
	});
}

function hostedDeepseekProviderCatalogResponse() {
	return Response.json({
		hostedChat: { enabled: true, tavilyConfigured: true },
		providers: [
			{
				id: "deepseek",
				name: "DeepSeek",
				description: "DeepSeek models",
				configured: true,
				missingEnvVars: [],
				defaultModelId: "deepseek/deepseek-chat",
				models: [
					{
						id: "deepseek/deepseek-chat",
						label: "DeepSeek Chat",
						description: "Default",
					},
				],
			},
		],
	});
}

describe("AgentChatMessage", () => {
	it("covers the approved Catalog in the first Generative UI batch", () => {
		const firstBatch = GENERATIVE_UI_SUGGESTIONS.slice(0, 3)
			.map(({ prompt }) => prompt)
			.join("\n");

		expect(STARTER_SUGGESTIONS).toHaveLength(6);
		expect(GENERATIVE_UI_SUGGESTIONS).toHaveLength(6);
		for (const component of [
			"Stack",
			"Grid",
			"Card",
			"Text",
			"Metric",
			"DataTable",
			"Chart",
			"Button",
			"Timeline",
			"MermaidDiagram",
		]) {
			expect(firstBatch).toContain(component);
		}
		expect(
			GENERATIVE_UI_SUGGESTIONS.every(({ prompt }) =>
				prompt.includes("Do not modify the workspace"),
			),
		).toBe(true);
	});

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
		expect(screen.getByText("Try a prompt")).toBeVisible();
		expect(screen.getByRole("tab", { name: "Starter" })).toHaveAttribute(
			"data-state",
			"active",
		);
		expect(screen.getByRole("tab", { name: "Generative UI" })).toBeVisible();
		for (const suggestion of screen.getAllByTestId("chat-suggestion")) {
			expect(suggestion.querySelector("svg")).toHaveClass("text-violet-500");
		}
	});

	it("only enables submit when the composer contains non-whitespace text", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.resolve(configuredProviderCatalogResponse())),
		);

		render(<ChatPane />);
		const input = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		const submit = screen.getByRole("button", { name: "Submit" });
		const form = input.closest("form");
		expect(form).toHaveClass(
			"[&_[data-slot=input-group]]:border-border/70",
			"[&_[data-slot=input-group]]:bg-card/80",
			"[&_[data-slot=input-group]]:hover:border-violet-400/30",
			"[&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:border-violet-400/40",
			"[&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-2",
			"[&_[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-violet-500/5",
		);

		expect(submit).toBeDisabled();
		await user.type(input, "   ");
		expect(submit).toBeDisabled();
		await user.type(input, "Build a dashboard");
		expect(submit).toBeEnabled();
		await user.clear(input);
		expect(submit).toBeDisabled();
	});

	it("enables submit for an attachment-only message", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.resolve(configuredProviderCatalogResponse())),
		);

		render(<ChatPane />);
		await screen.findByPlaceholderText("Describe what you want to build…");
		const submit = screen.getByRole("button", { name: "Submit" });
		expect(submit).toBeDisabled();

		await user.upload(
			screen.getByLabelText("Upload files"),
			new File(["diagram"], "diagram.txt", { type: "text/plain" }),
		);

		expect(submit).toBeEnabled();
	});

	it("uses demo credentials for the current page and forgets them on remount", async () => {
		const user = userEvent.setup();
		const chatBodies: Array<Record<string, unknown>> = [];
		const indexedDbOpen = vi.spyOn(window.indexedDB, "open");
		window.localStorage.clear();
		window.sessionStorage.clear();
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
				const url =
					typeof input === "string"
						? input
						: input instanceof URL
							? input.href
							: input.url;
				if (url.endsWith("/api/providers")) {
					return unconfiguredDeepseekProviderCatalogResponse();
				}
				if (url.endsWith("/api/chat")) {
					const body =
						input instanceof Request
							? await input.clone().json()
							: JSON.parse(String(init?.body));
					chatBodies.push(body as Record<string, unknown>);
					const stream = new ReadableStream<UIMessageChunk>({
						start(controller) {
							controller.enqueue({
								type: "start",
								messageId: "assistant-demo-credentials",
							});
							controller.enqueue({ type: "finish", finishReason: "stop" });
							controller.close();
						},
					});
					return createUIMessageStreamResponse({ stream });
				}
				throw new Error(`Unexpected request: ${url}`);
			}),
		);

		const page = render(<ChatPane />);
		expect(
			await screen.findByPlaceholderText("Configure a provider key to start"),
		).toBeDisabled();

		const settingsButton = screen.getByRole("button", {
			name: "Demo credential settings",
		});
		settingsButton.focus();
		await user.keyboard("{Enter}");
		const deepseekInput = screen.getByLabelText("DEEPSEEK_API_KEY");
		const tavilyInput = screen.getByLabelText("TAVILY_API_KEY");
		expect(screen.getAllByText("Not configured")).toHaveLength(2);
		expect(deepseekInput).toHaveAttribute("type", "password");
		expect(deepseekInput).toHaveAttribute("autocomplete", "off");
		await user.type(deepseekInput, "page-deepseek-secret");
		await user.type(tavilyInput, "page-tavily-secret");
		const saveButton = screen.getByRole("button", {
			name: "Save for this page",
		});
		expect(saveButton).toHaveClass("bg-primary", "text-primary-foreground");
		await user.click(saveButton);
		expect(chatBodies).toHaveLength(0);

		await user.click(settingsButton);
		expect(screen.getAllByText("Configured for this page")).toHaveLength(2);
		expect(screen.getByLabelText("DEEPSEEK_API_KEY")).toHaveValue("");
		expect(screen.getByLabelText("TAVILY_API_KEY")).toHaveValue("");
		await user.type(
			screen.getByLabelText("DEEPSEEK_API_KEY"),
			"page-deepseek-replacement",
		);
		await user.click(
			screen.getByRole("button", { name: "Save for this page" }),
		);

		const prompt = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(prompt, "Build a demo");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await waitFor(() => expect(chatBodies).toHaveLength(1));
		expect(chatBodies[0]?.ephemeralCredentials).toEqual({
			deepseekApiKey: "page-deepseek-replacement",
			tavilyApiKey: "page-tavily-secret",
		});
		const persistedValues = Array.from(
			{ length: window.localStorage.length },
			(_, index) =>
				window.localStorage.getItem(window.localStorage.key(index) ?? ""),
		).join("\n");
		expect(persistedValues).not.toContain("page-deepseek-secret");
		expect(persistedValues).not.toContain("page-deepseek-replacement");
		expect(persistedValues).not.toContain("page-tavily-secret");
		const sessionValues = Array.from(
			{ length: window.sessionStorage.length },
			(_, index) =>
				window.sessionStorage.getItem(window.sessionStorage.key(index) ?? ""),
		).join("\n");
		expect(sessionValues).not.toContain("page-deepseek-secret");
		expect(sessionValues).not.toContain("page-deepseek-replacement");
		expect(sessionValues).not.toContain("page-tavily-secret");
		expect(document.cookie).not.toContain("page-deepseek-secret");
		expect(document.cookie).not.toContain("page-deepseek-replacement");
		expect(document.cookie).not.toContain("page-tavily-secret");
		const { snapshot } = await browserWorkspace.getSnapshot();
		expect(JSON.stringify(snapshot)).not.toContain("page-deepseek-secret");
		expect(JSON.stringify(snapshot)).not.toContain("page-deepseek-replacement");
		expect(JSON.stringify(snapshot)).not.toContain("page-tavily-secret");
		expect(indexedDbOpen).not.toHaveBeenCalled();

		const exportedBlobs: Blob[] = [];
		vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
			exportedBlobs.push(blob as Blob);
			return "blob:credential-export-test";
		});
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
			() => undefined,
		);
		exportProjectAsJSON(useFs.getState().filesByPath, "credential-test");
		const exportedProject = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsText(exportedBlobs[0]);
		});
		expect(exportedProject).not.toContain("page-deepseek-secret");
		expect(exportedProject).not.toContain("page-deepseek-replacement");
		expect(exportedProject).not.toContain("page-tavily-secret");

		page.unmount();
		render(<ChatPane />);
		expect(
			await screen.findByPlaceholderText("Configure a provider key to start"),
		).toBeDisabled();
	});

	it("disables chat and page credential editing when deployment chat is off", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn((input: string | URL | Request) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.href
						: input.url;
			if (url.endsWith("/api/providers")) {
				return Promise.resolve(
					configuredProviderCatalogResponse({
						enabled: false,
						tavilyConfigured: true,
					}),
				);
			}
			return Promise.reject(new Error(`Unexpected request: ${url}`));
		});
		vi.stubGlobal("fetch", fetchMock);

		render(<ChatPane />);

		const input = await screen.findByPlaceholderText(
			"Chat disabled by deployment",
		);
		expect(input).toBeDisabled();
		expect(screen.getByText(/CHAT_ENABLED/)).toBeVisible();
		expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
		for (const suggestion of screen.getAllByTestId("chat-suggestion")) {
			expect(suggestion).toBeDisabled();
		}

		await user.click(
			screen.getByRole("button", { name: "Demo credential settings" }),
		);
		expect(screen.getAllByText("Disabled by deployment")).toHaveLength(2);
		expect(screen.getByLabelText("DEEPSEEK_API_KEY")).toBeDisabled();
		expect(screen.getByLabelText("TAVILY_API_KEY")).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Save for this page" }),
		).toBeDisabled();
		expect(
			fetchMock.mock.calls.some(([request]) => {
				const url =
					typeof request === "string"
						? request
						: request instanceof URL
							? request.href
							: request.url;
				return url.endsWith("/api/chat");
			}),
		).toBe(false);
	});

	it("does not report deployment-disabled status when catalog loading fails", async () => {
		const user = userEvent.setup();
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.reject(new Error("catalog unavailable"))),
		);

		render(<ChatPane />);

		expect(await screen.findByText("catalog unavailable")).toBeVisible();
		expect(
			screen.getByPlaceholderText("Provider configuration unavailable"),
		).toBeDisabled();
		expect(
			screen.queryByPlaceholderText("Chat disabled by deployment"),
		).not.toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "Demo credential settings" }),
		);
		expect(screen.getAllByText("Configuration unavailable")).toHaveLength(2);
		expect(
			screen.queryByText("Disabled by deployment"),
		).not.toBeInTheDocument();
	});

	it("shows hosted DeepSeek and Tavily configuration without exposing values", async () => {
		const user = userEvent.setup();
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
					return Promise.resolve(hostedDeepseekProviderCatalogResponse());
				}
				return Promise.reject(new Error(`Unexpected request: ${url}`));
			}),
		);

		render(<ChatPane />);
		expect(
			await screen.findByPlaceholderText("Describe what you want to build…"),
		).toBeEnabled();

		await user.click(
			screen.getByRole("button", { name: "Demo credential settings" }),
		);
		expect(
			screen.getAllByText("Configured by hosted environment"),
		).toHaveLength(2);
		expect(screen.getByLabelText("DEEPSEEK_API_KEY")).toHaveValue("");
		expect(screen.getByLabelText("TAVILY_API_KEY")).toHaveValue("");
		expect(
			screen.queryByText(/hosted-deepseek-value|hosted-tavily-value/i),
		).not.toBeInTheDocument();

		await user.type(screen.getByLabelText("DEEPSEEK_API_KEY"), "page-deepseek");
		await user.type(screen.getByLabelText("TAVILY_API_KEY"), "page-tavily");
		await user.click(
			screen.getByRole("button", { name: "Save for this page" }),
		);
		await user.click(
			screen.getByRole("button", { name: "Demo credential settings" }),
		);
		expect(screen.getAllByText("Configured for this page")).toHaveLength(2);
	});

	it("fills suggestions at the caret without sending and rotates each tab", async () => {
		const user = userEvent.setup();
		const fetchMock = vi.fn((input: string | URL | Request) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.href
						: input.url;
			if (url.endsWith("/api/providers")) {
				return Promise.resolve(configuredProviderCatalogResponse());
			}
			return Promise.reject(new Error(`Unexpected request: ${url}`));
		});
		vi.stubGlobal("fetch", fetchMock);

		render(<ChatPane />);
		const input = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await waitFor(() => expect(input).toBeEnabled());

		await user.click(screen.getByRole("tab", { name: "Generative UI" }));
		expect(screen.getAllByTestId("chat-suggestion")).toHaveLength(3);
		await user.click(
			screen.getByRole("button", { name: /Project health dashboard/ }),
		);

		const prompt = GENERATIVE_UI_SUGGESTIONS[0].prompt;
		expect(input).toHaveValue(prompt);
		expect(input).toHaveFocus();
		expect((input as HTMLTextAreaElement).selectionStart).toBe(prompt.length);
		expect((input as HTMLTextAreaElement).selectionEnd).toBe(prompt.length);
		expect(
			fetchMock.mock.calls.some(([request]) => {
				const url =
					typeof request === "string"
						? request
						: request instanceof URL
							? request.href
							: request.url;
				return url.endsWith("/api/chat");
			}),
		).toBe(false);

		await user.click(
			screen.getByRole("button", {
				name: "Refresh Generative UI suggestions",
			}),
		);
		expect(
			screen.getByRole("button", { name: /Product comparison board/ }),
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: /Project health dashboard/ }),
		).not.toBeInTheDocument();
		expect(input).toHaveValue(prompt);

		await user.click(screen.getByRole("tab", { name: "Starter" }));
		expect(
			screen.getByRole("button", { name: /Review the current app/ }),
		).toBeVisible();
		await user.click(
			screen.getByRole("button", { name: "Refresh Starter suggestions" }),
		);
		expect(
			screen.getByRole("button", { name: /Improve accessibility/ }),
		).toBeVisible();
		expect(input).toHaveValue(prompt);
	});

	it("scrolls to the bottom when the user sends while reading older messages", async () => {
		const user = userEvent.setup();
		let responseIndex = 0;
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

				responseIndex += 1;
				const stream = new ReadableStream<UIMessageChunk>({
					start(controller) {
						controller.enqueue({
							type: "start",
							messageId: `assistant-${responseIndex}`,
						});
						controller.enqueue({ type: "start-step" });
						controller.enqueue({ type: "finish-step" });
						controller.enqueue({ type: "finish", finishReason: "stop" });
						controller.close();
					},
				});
				return Promise.resolve(createUIMessageStreamResponse({ stream }));
			}),
		);

		render(<ChatPane />);
		const input = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(input, "First message");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await screen.findByText("First message");
		await waitFor(() =>
			expect(
				screen.getByPlaceholderText("Describe what you want to build…"),
			).toBeEnabled(),
		);

		const conversation = screen.getByRole("log");
		const scrollElement = conversation.firstElementChild as HTMLElement;
		scrollElement.style.overflow = "auto";
		Object.defineProperties(scrollElement, {
			clientHeight: { configurable: true, value: 200 },
			scrollHeight: { configurable: true, value: 1_000 },
		});
		act(() => {
			scrollElement.dispatchEvent(
				new WheelEvent("wheel", { bubbles: true, deltaY: -100 }),
			);
		});
		expect(within(conversation).getByRole("button")).toBeVisible();

		const nextInput = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(nextInput, "Second message");
		await user.click(screen.getByRole("button", { name: "Submit" }));

		await waitFor(() =>
			expect(within(conversation).queryByRole("button")).toBeNull(),
		);
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
		expect(
			screen.queryByRole("button", { name: /sources?$/ }),
		).not.toBeInTheDocument();
	});

	it("collapses completed reasoning and tool calls", async () => {
		const user = userEvent.setup();
		const reasoningMessage = {
			id: "assistant-collapsible-trace",
			role: "assistant",
			parts: [{ type: "reasoning", text: "Checking the request." }],
		} as UIMessage;
		const { rerender } = render(
			<AgentChatMessage isStreaming={true} message={reasoningMessage} />,
		);

		const reasoningTrigger = screen.getByRole("button", {
			name: /Thinking/,
		});
		expect(reasoningTrigger).toHaveAttribute("aria-expanded", "true");

		const runningToolMessage = {
			...reasoningMessage,
			parts: [
				...reasoningMessage.parts,
				{
					type: "dynamic-tool",
					toolName: "web_search",
					toolCallId: "call-collapsible-search",
					state: "input-available",
					input: { query: "current information" },
				},
			],
		} as UIMessage;
		rerender(
			<AgentChatMessage isStreaming={true} message={runningToolMessage} />,
		);

		await waitFor(() =>
			expect(reasoningTrigger).toHaveAttribute("aria-expanded", "false"),
		);
		const toolTrigger = screen.getByRole("button", {
			name: "web searchRunning",
		});
		expect(toolTrigger).toHaveAttribute("aria-expanded", "true");

		const completedToolMessage = {
			...runningToolMessage,
			parts: [
				runningToolMessage.parts[0],
				{
					...runningToolMessage.parts[1],
					state: "output-available",
					output: { query: "current information", sources: [] },
				},
			],
		} as UIMessage;
		rerender(
			<AgentChatMessage isStreaming={false} message={completedToolMessage} />,
		);

		await waitFor(() =>
			expect(toolTrigger).toHaveAttribute("aria-expanded", "false"),
		);
		await user.click(toolTrigger);
		expect(toolTrigger).toHaveAttribute("aria-expanded", "true");
	});

	it("renders one generated interface at the first spec part position", async () => {
		const message = {
			id: "assistant-generative-ui",
			role: "assistant",
			parts: [
				{ type: "text", text: "Before interface" },
				{
					type: "data-spec",
					data: {
						type: "patch",
						patch: { op: "add", path: "/root", value: "root" },
					},
				},
				{
					type: "dynamic-tool",
					toolName: "read_file",
					toolCallId: "call-after-spec",
					state: "output-available",
					input: { path: "/src/App.tsx" },
					output: { path: "/src/App.tsx" },
				},
				{
					type: "data-spec",
					data: {
						type: "patch",
						patch: {
							op: "add",
							path: "/elements/root",
							value: { type: "Text", props: { content: "UI" }, children: [] },
						},
					},
				},
				{ type: "text", text: "After interface" },
			],
		} as unknown as UIMessage;

		render(<AgentChatMessage isStreaming={false} message={message} />);

		const before = await screen.findByText("Before interface");
		const generated = await screen.findByTestId("generated-interface");
		const tool = screen.getByText("read file");
		const after = await screen.findByText("After interface");

		expect(generated).toHaveTextContent("2 spec parts");
		expect(screen.getAllByTestId("generated-interface")).toHaveLength(1);
		expect(
			before.compareDocumentPosition(generated) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			generated.compareDocumentPosition(tool) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			tool.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("shows web sources in the tool timeline and aggregates them after the answer", async () => {
		const user = userEvent.setup();
		const message = {
			id: "assistant-web-research",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "web_search",
					toolCallId: "call-web-search",
					state: "output-available",
					input: { query: "AI Elements citations" },
					output: {
						query: "AI Elements citations",
						sources: [
							{
								title: "Sources component",
								url: "https://elements.ai-sdk.dev/components/sources",
								snippet: "A source list for AI responses.",
							},
							{
								title: "Tavily search API",
								url: "https://docs.tavily.com/api-reference/endpoint/search",
							},
						],
					},
				},
				{
					type: "text",
					text: "The research is complete.",
				},
			],
		} as UIMessage;

		render(<AgentChatMessage isStreaming={false} message={message} />);
		const toolTrigger = screen.getByRole("button", {
			name: "web searchCompleted",
		});
		expect(toolTrigger).toHaveAttribute("aria-expanded", "false");
		await user.click(toolTrigger);

		const timelineSource = screen.getByRole("link", {
			name: "Sources component",
		});
		expect(timelineSource).toBeVisible();
		expect(timelineSource).toHaveAttribute("target", "_blank");
		expect(timelineSource).toHaveAttribute(
			"rel",
			expect.stringContaining("noreferrer"),
		);
		expect(timelineSource).toHaveAttribute(
			"rel",
			expect.stringContaining("noopener"),
		);
		expect(screen.getByText("elements.ai-sdk.dev")).toBeVisible();

		const answer = await screen.findByText("The research is complete.");
		const trigger = screen.getByRole("button", { name: "2 sources" });
		expect(
			answer.compareDocumentPosition(trigger) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();

		await user.hover(trigger);
		const sourceList = await screen.findByRole("list", { name: "Sources" });
		const aggregatedSource = within(sourceList).getByRole("link", {
			name: "Sources component",
		});
		expect(aggregatedSource).toHaveAttribute(
			"href",
			"https://elements.ai-sdk.dev/components/sources",
		);
		expect(aggregatedSource.tabIndex).toBe(0);
		expect(screen.getByRole("dialog", { name: "Sources" })).toHaveClass(
			"max-h-80",
			"overflow-y-auto",
		);
		expect(
			within(sourceList).getByRole("link", { name: "Tavily search API" }),
		).toBeVisible();

		await user.unhover(trigger);
		await waitFor(() =>
			expect(
				screen.queryByRole("list", { name: "Sources" }),
			).not.toBeInTheDocument(),
		);
		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(await screen.findByRole("list", { name: "Sources" })).toBeVisible();

		await user.unhover(trigger);
		act(() => trigger.blur());
		await waitFor(() =>
			expect(trigger).toHaveAttribute("aria-expanded", "false"),
		);
		act(() => trigger.focus());
		const focusedList = await screen.findByRole("list", { name: "Sources" });
		expect(focusedList).toBeVisible();
		await user.keyboard("{ArrowDown}");
		await waitFor(() =>
			expect(
				within(focusedList).getByRole("link", { name: "Sources component" }),
			).toHaveFocus(),
		);
	});

	it("renders a compact weather result with its attribution", async () => {
		const user = userEvent.setup();
		const message = {
			id: "assistant-weather",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "weather_search",
					toolCallId: "call-weather",
					state: "output-available",
					input: { location: "Shanghai" },
					output: {
						location: {
							name: "Shanghai",
							latitude: 31.23,
							longitude: 121.47,
							timezone: "Asia/Shanghai",
						},
						units: {
							temperature: "°C",
							windSpeed: "km/h",
							precipitation: "mm",
						},
						current: {
							time: "2026-07-16T10:00",
							temperature: 30,
							apparentTemperature: 34,
							condition: "Partly cloudy",
							windSpeed: 12,
							precipitation: 0,
						},
						forecast: [
							{
								date: "2026-07-16",
								condition: "Partly cloudy",
								temperatureMax: 34,
								temperatureMin: 27,
								precipitationProbability: 20,
							},
						],
						sources: [
							{
								title: "Weather data by Open-Meteo.com",
								url: "https://open-meteo.com/",
							},
						],
					},
				},
			],
		} as UIMessage;

		render(<AgentChatMessage isStreaming={false} message={message} />);
		const toolTrigger = screen.getByRole("button", {
			name: "weather searchCompleted",
		});
		expect(toolTrigger).toHaveAttribute("aria-expanded", "false");
		await user.click(toolTrigger);

		expect(screen.getByText("Shanghai")).toBeVisible();
		expect(screen.getByText("30 °C")).toBeVisible();
		expect(screen.getByText("Partly cloudy")).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Weather data by Open-Meteo.com" }),
		).toHaveAttribute("href", "https://open-meteo.com/");
		expect(screen.getByRole("button", { name: "1 source" })).toBeVisible();
	});

	it("does not create citations when web search returns no verified sources", async () => {
		const user = userEvent.setup();
		const message = {
			id: "assistant-empty-research",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "web_search",
					toolCallId: "call-empty-search",
					state: "output-available",
					input: { query: "no results" },
					output: { query: "no results", sources: [] },
				},
			],
		} as UIMessage;

		render(<AgentChatMessage isStreaming={false} message={message} />);
		await user.click(
			screen.getByRole("button", { name: "web searchCompleted" }),
		);

		expect(screen.getByRole("status")).toHaveTextContent(
			"No verified sources found.",
		);
		expect(
			screen.queryByRole("button", { name: /sources?$/ }),
		).not.toBeInTheDocument();
	});

	it("keeps a running web search trace open with its query visible", () => {
		const message = {
			id: "assistant-running-search",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "web_search",
					toolCallId: "call-running-search",
					state: "input-available",
					input: { query: "current web information" },
				},
			],
		} as UIMessage;

		render(<AgentChatMessage isStreaming={true} message={message} />);

		expect(
			screen.getByRole("button", { name: "web searchRunning" }),
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText(/current web information/)).toBeVisible();
	});

	it("shows a sanitized weather error without creating citations", async () => {
		const user = userEvent.setup();
		const message = {
			id: "assistant-weather-error",
			role: "assistant",
			parts: [
				{
					type: "dynamic-tool",
					toolName: "weather_search",
					toolCallId: "call-weather-error",
					state: "output-error",
					input: { location: "Shanghai" },
					errorText: "Weather service is unavailable. Try again later.",
				},
			],
		} as UIMessage;

		render(<AgentChatMessage isStreaming={false} message={message} />);

		const toolTrigger = screen.getByRole("button", {
			name: "weather searchError",
		});
		expect(toolTrigger).toHaveAttribute("aria-expanded", "false");
		await user.click(toolTrigger);
		expect(
			screen.getByText("Weather service is unavailable. Try again later."),
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: /sources?$/ }),
		).not.toBeInTheDocument();
	});

	it("renders typed tool errors with AI Elements", async () => {
		const user = userEvent.setup();
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
		const toolTrigger = screen.getByRole("button", { name: "read fileError" });
		expect(toolTrigger).toHaveAttribute("aria-expanded", "false");
		await user.click(toolTrigger);
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
		expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
		expect(
			document.querySelectorAll('[data-slot="agent-chat-composer"]'),
		).toHaveLength(1);
		await user.type(input, "Update the app");
		expect(screen.getByRole("button", { name: "Submit" })).toHaveClass(
			"bg-neutral-800",
			"dark:bg-neutral-200",
			"dark:text-neutral-950",
		);
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
			expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled(),
		);
		expect(useAgentChangeSessionStore.getState().phase).toBe("idle");
	});

	it("aborts the active chat request when the chat pane unmounts", async () => {
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

		const page = render(<ChatPane />);
		const input = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(input, "Keep working");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await screen.findByRole("button", { name: "Stop" });

		page.unmount();

		await waitFor(() => expect(chatSignal?.aborted).toBe(true));
	});

	it("stops the active run before clearing demo credentials", async () => {
		const user = userEvent.setup();
		const chatBodies: Array<Record<string, unknown>> = [];
		let chatSignal: AbortSignal | undefined;
		let chatRequestCount = 0;
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
				chatRequestCount += 1;

				const captureBody = async () => {
					const body =
						input instanceof Request
							? await input.clone().json()
							: JSON.parse(String(init?.body));
					chatBodies.push(body as Record<string, unknown>);
				};
				void captureBody();
				if (chatRequestCount > 1) {
					const stream = new ReadableStream<UIMessageChunk>({
						start(controller) {
							controller.enqueue({
								type: "start",
								messageId: "assistant-after-clear",
							});
							controller.enqueue({ type: "finish", finishReason: "stop" });
							controller.close();
						},
					});
					return Promise.resolve(createUIMessageStreamResponse({ stream }));
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
		await screen.findByPlaceholderText("Describe what you want to build…");
		await user.click(
			screen.getByRole("button", { name: "Demo credential settings" }),
		);
		await user.type(screen.getByLabelText("DEEPSEEK_API_KEY"), "page-deepseek");
		await user.type(screen.getByLabelText("TAVILY_API_KEY"), "page-tavily");
		await user.click(
			screen.getByRole("button", { name: "Save for this page" }),
		);

		const prompt = screen.getByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(prompt, "First run");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await screen.findByRole("button", { name: "Stop" });
		await user.click(
			screen.getByRole("button", { name: "Demo credential settings" }),
		);
		await user.click(
			screen.getByRole("button", { name: "Clear page credentials" }),
		);

		await waitFor(() => expect(chatSignal?.aborted).toBe(true));
		await waitFor(() => expect(chatBodies).toHaveLength(1));
		expect(chatBodies[0]?.ephemeralCredentials).toEqual({
			tavilyApiKey: "page-tavily",
		});

		const nextPrompt = await screen.findByPlaceholderText(
			"Describe what you want to build…",
		);
		await user.type(nextPrompt, "Second run");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await waitFor(() => expect(chatBodies).toHaveLength(2));
		expect(chatBodies[1]).not.toHaveProperty("ephemeralCredentials");
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
