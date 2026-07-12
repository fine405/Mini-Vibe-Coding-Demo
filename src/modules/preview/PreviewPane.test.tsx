import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PreviewPane } from "@/modules/preview/PreviewPane";
import { useBrowserWorkspaceFiles } from "@/modules/workspace/browser";

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

// Mock Sandpack components
vi.mock("@codesandbox/sandpack-react", () => ({
	SandpackProvider: ({
		children,
		files,
		options,
	}: {
		children: React.ReactNode;
		files: Record<string, { code: string }>;
		options?: {
			bundlerTimeOut?: number;
			bundlerURL?: string;
			classes?: Record<string, string>;
			initMode?: string;
		};
	}) => (
		<div
			data-bundler-timeout={options?.bundlerTimeOut}
			data-bundler-url={options?.bundlerURL}
			data-init-mode={options?.initMode}
			data-loading-class={options?.classes?.["sp-loading"]}
			data-testid="sandpack-provider"
		>
			{Object.entries(files).map(([path, file]) => (
				<div key={path} data-testid={`file-${path}`}>
					{file.code}
				</div>
			))}
			{children}
		</div>
	),
	SandpackPreview: () => <div data-testid="sandpack-preview" />,
	useSandpack: () => ({
		sandpack: {
			runSandpack: vi.fn(),
		},
	}),
	useSandpackConsole: () => ({
		logs: [],
		reset: vi.fn(),
	}),
}));

// Mock the browser Workspace read interface
vi.mock("../workspace/browser", () => ({
	useBrowserWorkspaceFiles: vi.fn(),
}));

describe("Preview Refresh", () => {
	it("starts the Sandpack default bundler immediately with a bounded timeout", () => {
		vi.mocked(useBrowserWorkspaceFiles).mockReturnValue({
			"/src/App.js": {
				path: "/src/App.js",
				content: "export default function App() { return <h1>Hello</h1>; }",
				status: "clean" as const,
			},
		});

		render(<PreviewPane />);

		const provider = screen.getByTestId("sandpack-provider");
		expect(provider).not.toHaveAttribute("data-bundler-url");
		expect(provider).toHaveAttribute("data-init-mode", "immediate");
		expect(provider).toHaveAttribute("data-bundler-timeout", "15000");
		expect(provider).toHaveAttribute("data-loading-class", "hidden");
	});

	it("should render preview with initial files", () => {
		const mockFilesByPath = {
			"/index.js": {
				path: "/index.js",
				content: "console.log('initial');",
				status: "clean" as const,
			},
		};

		vi.mocked(useBrowserWorkspaceFiles).mockReturnValue(mockFilesByPath);

		render(<PreviewPane />);

		expect(screen.getByTestId("sandpack-preview")).toBeInTheDocument();
		expect(screen.getByTestId("file-/index.js")).toHaveTextContent(
			"console.log('initial');",
		);
	});

	it("should update preview when files change", () => {
		const mockFilesByPath = {
			"/App.js": {
				path: "/App.js",
				content: "export default function App() { return <div>Hello</div>; }",
				status: "clean" as const,
			},
		};

		vi.mocked(useBrowserWorkspaceFiles).mockReturnValue(mockFilesByPath);

		const { rerender } = render(<PreviewPane />);

		expect(screen.getByTestId("file-/App.js")).toHaveTextContent("Hello");

		// Simulate file update
		const updatedFilesByPath = {
			"/App.js": {
				path: "/App.js",
				content: "export default function App() { return <div>Updated</div>; }",
				status: "modified" as const,
			},
		};

		vi.mocked(useBrowserWorkspaceFiles).mockReturnValue(updatedFilesByPath);

		rerender(<PreviewPane />);

		expect(screen.getByTestId("file-/App.js")).toHaveTextContent("Updated");
	});

	it("should handle multiple files", () => {
		const mockFilesByPath = {
			"/index.js": {
				path: "/index.js",
				content: "import App from './App';",
				status: "clean" as const,
			},
			"/App.js": {
				path: "/App.js",
				content: "export default function App() {}",
				status: "clean" as const,
			},
			"/styles.css": {
				path: "/styles.css",
				content: "body { margin: 0; }",
				status: "clean" as const,
			},
		};

		vi.mocked(useBrowserWorkspaceFiles).mockReturnValue(mockFilesByPath);

		render(<PreviewPane />);

		expect(screen.getByTestId("file-/index.js")).toBeInTheDocument();
		expect(screen.getByTestId("file-/App.js")).toBeInTheDocument();
		expect(screen.getByTestId("file-/styles.css")).toBeInTheDocument();
	});

	it("should handle file addition", () => {
		const initialFiles = {
			"/index.js": {
				path: "/index.js",
				content: "console.log('test');",
				status: "clean" as const,
			},
		};

		vi.mocked(useBrowserWorkspaceFiles).mockReturnValue(initialFiles);

		const { rerender } = render(<PreviewPane />);

		expect(screen.queryByTestId("file-/new.js")).not.toBeInTheDocument();

		// Add new file
		const updatedFiles = {
			...initialFiles,
			"/new.js": {
				path: "/new.js",
				content: "export const x = 1;",
				status: "new" as const,
			},
		};

		vi.mocked(useBrowserWorkspaceFiles).mockReturnValue(updatedFiles);

		rerender(<PreviewPane />);

		expect(screen.getByTestId("file-/new.js")).toBeInTheDocument();
		expect(screen.getByTestId("file-/new.js")).toHaveTextContent(
			"export const x = 1;",
		);
	});

	it("should handle file deletion", () => {
		const initialFiles = {
			"/index.js": {
				path: "/index.js",
				content: "console.log('test');",
				status: "clean" as const,
			},
			"/delete-me.js": {
				path: "/delete-me.js",
				content: "// to be deleted",
				status: "clean" as const,
			},
		};

		vi.mocked(useBrowserWorkspaceFiles).mockReturnValue(initialFiles);

		const { rerender } = render(<PreviewPane />);

		expect(screen.getByTestId("file-/delete-me.js")).toBeInTheDocument();

		// Delete file
		const updatedFiles = {
			"/index.js": initialFiles["/index.js"],
		};

		vi.mocked(useBrowserWorkspaceFiles).mockReturnValue(updatedFiles);

		rerender(<PreviewPane />);

		expect(screen.queryByTestId("file-/delete-me.js")).not.toBeInTheDocument();
	});
});
