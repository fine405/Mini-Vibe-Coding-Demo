import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentChangeSessionStore } from "@/modules/agent-chat/change-session";
import { useFs } from "@/modules/fs/store";
import { useConsoleStore } from "@/modules/preview/consoleStore";
import { PreviewPane } from "@/modules/preview/PreviewPane";
import { browserWorkspace } from "@/modules/workspace/browser";
import { hashText } from "@/modules/workspace/domain";

const sandpackMock = vi.hoisted(() => ({
	nextProviderId: 0,
	previewEvents: [] as string[],
}));

vi.mock("@/modules/fs/persistence", () => ({
	clearWorkspace: vi.fn().mockResolvedValue(undefined),
	loadWorkspace: vi.fn().mockResolvedValue(null),
	saveWorkspace: vi.fn().mockResolvedValue(undefined),
	scheduleWorkspaceSave: vi.fn(),
}));

vi.mock("@codesandbox/sandpack-react", async () => {
	const React = await import("react");
	type Files = Record<string, { code: string }>;
	type Listener = (message: {
		status?: string;
		type: "done" | "start" | "status" | "success";
	}) => void;
	type SandpackContextValue = {
		listen: (listener: Listener) => () => void;
		providerId: number;
		sandpack: {
			clients: Record<string, { status: string }>;
			status: string;
		};
	};
	const SandpackContext = React.createContext<SandpackContextValue | null>(
		null,
	);

	return {
		SandpackProvider: ({
			children,
			files,
		}: {
			children: React.ReactNode;
			files: Files;
		}) => {
			const [compiledFiles] = React.useState(files);
			const [providerId] = React.useState(() => ++sandpackMock.nextProviderId);
			const listeners = React.useRef(new Set<Listener>());
			const emit = React.useCallback((message: Parameters<Listener>[0]) => {
				listeners.current.forEach((listener) => listener(message));
			}, []);
			const client = React.useMemo(() => ({ status: "initializing" }), []);
			React.useEffect(() => {
				const timeout = window.setTimeout(() => emit({ type: "done" }), 0);
				return () => window.clearTimeout(timeout);
			}, [emit]);
			const contextValue: SandpackContextValue = {
				listen: (listener) => {
					listeners.current.add(listener);
					return () => listeners.current.delete(listener);
				},
				providerId,
				sandpack: {
					clients: { preview: client },
					status: "running",
				},
			};

			return (
				<SandpackContext.Provider value={contextValue}>
					<div data-testid="sandpack-provider">
						{Object.entries(compiledFiles).map(([path, file]) => (
							<div key={path} data-testid={`file-${path}`}>
								{file.code}
							</div>
						))}
						{children}
					</div>
				</SandpackContext.Provider>
			);
		},
		SandpackPreview: () => {
			const context = React.useContext(SandpackContext);
			if (!context) throw new Error("Missing mocked SandpackProvider");

			React.useEffect(() => {
				sandpackMock.previewEvents.push(`mount:${context.providerId}`);
				return () => {
					sandpackMock.previewEvents.push(`unmount:${context.providerId}`);
				};
			}, [context.providerId]);

			return <div data-testid="sandpack-preview" />;
		},
		useSandpack: () => {
			const context = React.useContext(SandpackContext);
			if (!context) throw new Error("Missing mocked SandpackProvider");
			return context;
		},
		useSandpackConsole: () => ({ logs: [], reset: vi.fn() }),
	};
});

beforeAll(() => {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
});

describe("PreviewPane workspace integration", () => {
	beforeEach(async () => {
		sandpackMock.nextProviderId = 0;
		sandpackMock.previewEvents.length = 0;
		await useFs.getState().resetFs();
		useAgentChangeSessionStore.getState().clear();
		useConsoleStore.getState().clearLogs();
	});

	it("updates Sandpack when the editor changes a workspace file", async () => {
		const path = "/src/App.js";
		render(<PreviewPane />);

		act(() => {
			useFs
				.getState()
				.updateFileContent(path, "export default () => <h1>Manual edit</h1>;");
		});

		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Manual edit",
			),
		);
	});

	it("prewarms the replacement preview before retiring the current one", async () => {
		const path = "/src/App.js";
		render(<PreviewPane />);
		const clearConsole = screen.getByRole("button", { name: "Clear Console" });

		act(() => {
			useFs
				.getState()
				.updateFileContent(path, "export default () => <h1>No flash</h1>;");
		});

		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent("No flash"),
		);
		expect(screen.getAllByTestId("preview-runtime")).toHaveLength(1);
		expect(screen.getByRole("button", { name: "Clear Console" })).toBe(
			clearConsole,
		);
		const replacementMountedAt = sandpackMock.previewEvents.indexOf("mount:2");
		const currentUnmountedAt = sandpackMock.previewEvents.indexOf("unmount:1");
		expect(replacementMountedAt).toBeGreaterThan(-1);
		expect(currentUnmountedAt).toBeGreaterThan(replacementMountedAt);
	});

	it("previews an Agent draft without applying it to the workspace", async () => {
		const path = "/src/App.js";
		const before = useFs.getState().filesByPath[path].content;
		const after = before.replace("Hello React", "Agent Draft");
		const { snapshot } = await browserWorkspace.getSnapshot();
		render(<PreviewPane />);

		act(() => {
			const session = useAgentChangeSessionStore.getState();
			session.begin(snapshot);
			useAgentChangeSessionStore.getState().projectToolResult({
				toolName: "write_file",
				input: { path, content: after },
				output: {
					path,
					hash: hashText(after),
					bytes: new TextEncoder().encode(after).byteLength,
				},
			});
		});

		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Agent Draft",
			),
		);
		expect(screen.getByRole("button", { name: "Agent Draft" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(useFs.getState().filesByPath[path].content).toBe(before);
	});

	it("switches between the current workspace and the Agent draft", async () => {
		const user = userEvent.setup();
		const path = "/src/App.js";
		const before = useFs.getState().filesByPath[path].content;
		const after = before.replace("Hello React", "Switchable Draft");
		const { snapshot } = await browserWorkspace.getSnapshot();
		render(<PreviewPane />);
		const clearConsole = screen.getByRole("button", { name: "Clear Console" });

		act(() => {
			useAgentChangeSessionStore.getState().begin(snapshot);
			useAgentChangeSessionStore.getState().projectToolResult({
				toolName: "write_file",
				input: { path, content: after },
				output: { path, hash: hashText(after) },
			});
		});

		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Switchable Draft",
			),
		);
		await user.click(screen.getByRole("button", { name: "Current" }));
		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Hello React",
			),
		);
		expect(screen.getByRole("button", { name: "Current" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		await user.click(screen.getByRole("button", { name: "Agent Draft" }));
		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Switchable Draft",
			),
		);
		expect(screen.getByRole("button", { name: "Clear Console" })).toBe(
			clearConsole,
		);
	});

	it("previews only the Agent hunks selected for approval", async () => {
		const path = "/src/App.js";
		const before = [
			"export default function App() {",
			"  return (",
			"    <main>",
			"      <h1>Current heading</h1>",
			...Array.from(
				{ length: 10 },
				(_, index) => `      <p>Spacer ${index}</p>`,
			),
			"      <footer>Current footer</footer>",
			"    </main>",
			"  );",
			"}",
		].join("\n");
		const after = before
			.replace("Current heading", "Selected draft heading")
			.replace("Current footer", "Unselected draft footer");
		useFs.getState().updateFileContent(path, before);
		const { snapshot } = await browserWorkspace.getSnapshot();
		const changeSet = {
			id: "agent:selected-preview",
			baseRevision: snapshot.revision,
			summary: "Update two distant regions",
			changes: [
				{
					op: "update" as const,
					path,
					beforeHash: snapshot.files[path].hash,
					content: after,
				},
			],
		};
		render(<PreviewPane />);

		act(() => {
			useAgentChangeSessionStore.getState().begin(snapshot);
			useAgentChangeSessionStore.getState().projectToolResult({
				toolName: "finalize_changes",
				input: { summary: changeSet.summary },
				output: changeSet,
			});
			useAgentChangeSessionStore
				.getState()
				.initializeReviewSelections(changeSet.id, { 0: [0] });
		});

		await waitFor(() => {
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Selected draft heading",
			);
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Current footer",
			);
		});
		expect(screen.getByTestId(`file-${path}`)).not.toHaveTextContent(
			"Unselected draft footer",
		);
		expect(useFs.getState().filesByPath[path].content).toBe(before);
	});

	it("returns to the current workspace when the Agent draft is rejected", async () => {
		const path = "/src/App.js";
		const before = useFs.getState().filesByPath[path].content;
		const after = before.replace("Hello React", "Rejected Draft");
		const { snapshot } = await browserWorkspace.getSnapshot();
		render(<PreviewPane />);
		const clearConsole = screen.getByRole("button", { name: "Clear Console" });

		act(() => {
			useAgentChangeSessionStore.getState().begin(snapshot);
			useAgentChangeSessionStore.getState().projectToolResult({
				toolName: "write_file",
				input: { path, content: after },
				output: { path, hash: hashText(after) },
			});
		});
		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Rejected Draft",
			),
		);

		act(() => useAgentChangeSessionStore.getState().clear());

		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Hello React",
			),
		);
		expect(
			screen.queryByRole("button", { name: "Agent Draft" }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Clear Console" })).toBe(
			clearConsole,
		);
		expect(useFs.getState().filesByPath[path].content).toBe(before);
	});

	it("promotes an approved Agent draft to the current workspace", async () => {
		const path = "/src/App.js";
		const before = useFs.getState().filesByPath[path].content;
		const after = before.replace("Hello React", "Approved Draft");
		const { snapshot } = await browserWorkspace.getSnapshot();
		const changeSet = {
			id: "agent:approved-preview",
			baseRevision: snapshot.revision,
			summary: "Approve the draft preview",
			changes: [
				{
					op: "update" as const,
					path,
					beforeHash: snapshot.files[path].hash,
					content: after,
				},
			],
		};
		render(<PreviewPane />);
		const clearConsole = screen.getByRole("button", { name: "Clear Console" });

		act(() => {
			useAgentChangeSessionStore.getState().begin(snapshot);
			useAgentChangeSessionStore.getState().projectToolResult({
				toolName: "finalize_changes",
				input: { summary: changeSet.summary },
				output: changeSet,
			});
		});
		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Approved Draft",
			),
		);
		expect(useFs.getState().filesByPath[path].content).toBe(before);

		let result: Awaited<ReturnType<typeof browserWorkspace.apply>> | undefined;
		await act(async () => {
			result = await browserWorkspace.apply(changeSet);
			useAgentChangeSessionStore.getState().clear();
		});

		expect(result).toMatchObject({ ok: true });
		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Approved Draft",
			),
		);
		expect(
			screen.queryByRole("button", { name: "Agent Draft" }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Clear Console" })).toBe(
			clearConsole,
		);
		expect(useFs.getState().filesByPath[path].content).toBe(after);
	});

	it("separates Console output when switching to the Agent draft", async () => {
		const path = "/src/App.js";
		const before = useFs.getState().filesByPath[path].content;
		const after = before.replace("Hello React", "Draft Console");
		const { snapshot } = await browserWorkspace.getSnapshot();
		useConsoleStore.getState().addLog({
			id: "current-log",
			method: "log",
			data: ["current output"],
			timestamp: 0,
		});
		render(<PreviewPane />);
		expect(screen.getByText("current output")).toBeInTheDocument();

		act(() => {
			useAgentChangeSessionStore.getState().begin(snapshot);
			useAgentChangeSessionStore.getState().projectToolResult({
				toolName: "write_file",
				input: { path, content: after },
				output: { path, hash: hashText(after) },
			});
		});

		await waitFor(() =>
			expect(screen.queryByText("current output")).not.toBeInTheDocument(),
		);
		expect(screen.getByText("Agent Draft", { selector: "span" })).toBeVisible();
	});

	it("updates Sandpack when an Agent change is applied", async () => {
		const path = "/src/App.js";
		const { snapshot } = await browserWorkspace.getSnapshot();
		render(<PreviewPane />);

		let result: Awaited<ReturnType<typeof browserWorkspace.apply>> | undefined;
		await act(async () => {
			result = await browserWorkspace.apply({
				id: "agent-preview-refresh",
				baseRevision: snapshot.revision,
				summary: "Update the preview",
				changes: [
					{
						op: "update",
						path,
						beforeHash: snapshot.files[path].hash,
						content: "export default () => <h1>Agent edit</h1>;",
					},
				],
			});
		});

		expect(result).toMatchObject({ ok: true });
		await waitFor(() =>
			expect(screen.getByTestId(`file-${path}`)).toHaveTextContent(
				"Agent edit",
			),
		);
	});
});
