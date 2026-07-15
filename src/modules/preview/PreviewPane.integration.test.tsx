import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useFs } from "@/modules/fs/store";
import { PreviewPane } from "@/modules/preview/PreviewPane";
import { browserWorkspace } from "@/modules/workspace/browser";

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
