import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useFs } from "../fs/store";
import type { VirtualFile } from "../fs/types";
import { PreviewPane } from "./PreviewPane";

// Mock Sandpack component
vi.mock("@codesandbox/sandpack-react", () => ({
	Sandpack: ({ files }: { files: Record<string, { code: string }> }) => (
		<div data-testid="sandpack-preview">
			{Object.entries(files).map(([path, file]) => (
				<div key={path} data-testid={`file-${path}`}>
					{file.code}
				</div>
			))}
		</div>
	),
}));

// Mock FS store
vi.mock("../fs/store", () => ({
	useFs: vi.fn(),
}));

function mockFsState(filesByPath: Record<string, VirtualFile>) {
	return {
		filesByPath,
	} as unknown as ReturnType<typeof useFs>;
}

describe("Preview Refresh", () => {
	it("should render preview with initial files", () => {
		const mockFilesByPath = {
			"/index.js": {
				path: "/index.js",
				content: "console.log('initial');",
				status: "clean" as const,
			},
		};

		vi.mocked(useFs).mockReturnValue(mockFsState(mockFilesByPath));

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

		vi.mocked(useFs).mockReturnValue(mockFsState(mockFilesByPath));

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

		vi.mocked(useFs).mockReturnValue(mockFsState(updatedFilesByPath));

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

		vi.mocked(useFs).mockReturnValue(mockFsState(mockFilesByPath));

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

		vi.mocked(useFs).mockReturnValue(mockFsState(initialFiles));

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

		vi.mocked(useFs).mockReturnValue(mockFsState(updatedFiles));

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

		vi.mocked(useFs).mockReturnValue(mockFsState(initialFiles));

		const { rerender } = render(<PreviewPane />);

		expect(screen.getByTestId("file-/delete-me.js")).toBeInTheDocument();

		// Delete file
		const updatedFiles = {
			"/index.js": initialFiles["/index.js"],
		};

		vi.mocked(useFs).mockReturnValue(mockFsState(updatedFiles));

		rerender(<PreviewPane />);

		expect(screen.queryByTestId("file-/delete-me.js")).not.toBeInTheDocument();
	});
});
