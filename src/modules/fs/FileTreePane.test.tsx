import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileTreePane } from "./FileTreePane";

// Mock dependencies
vi.mock("./store", () => ({
	useFs: () => ({
		filesByPath: {
			"/src/index.ts": { content: "", path: "/src/index.ts" },
			"/src/components/Button.tsx": {
				content: "",
				path: "/src/components/Button.tsx",
			},
		},
		createFile: vi.fn(),
		deleteFile: vi.fn(),
		renameFile: vi.fn(),
		setFiles: vi.fn(),
		resetFs: vi.fn(),
	}),
}));

vi.mock("@/modules/editor", () => ({
	useEditor: () => ({
		openFile: vi.fn(),
		activeFilePath: "/src/index.ts",
		closeAllFiles: vi.fn(),
		closeFile: vi.fn(),
	}),
}));

// Mock Lucide icons to avoid issues in test environment
vi.mock("lucide-react", () => ({
	ChevronDown: () => <div data-testid="icon-chevron-down" />,
	ChevronRight: () => <div data-testid="icon-chevron-right" />,
	Download: () => <div data-testid="icon-download" />,
	FileCode2: () => <div data-testid="icon-file" />,
	Folder: () => <div data-testid="icon-folder" />,
	Pencil: () => <div data-testid="icon-pencil" />,
	Plus: () => <div data-testid="icon-plus" />,
	Search: () => <div data-testid="icon-search" />,
	Trash2: () => <div data-testid="icon-trash" />,
	Upload: () => <div data-testid="icon-upload" />,
	X: () => <div data-testid="icon-x" />,
	Check: () => <div data-testid="icon-check" />,
	Circle: () => <div data-testid="icon-circle" />,
}));

// Mock Radix UI Context Menu
// Since portals and complex interactions are hard to test in JSDOM without full setup,
// we'll mock the Context Menu components to render inline for simplicity in finding elements,
// or just verify the triggers are present.
vi.mock("@/components/ui/context-menu", () => ({
	ContextMenu: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="context-menu">{children}</div>
	),
	ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="context-menu-trigger">{children}</div>
	),
	ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="context-menu-content">{children}</div>
	),
	ContextMenuItem: ({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
	}) => (
		<div
			data-testid="context-menu-item"
			role="menuitem"
			tabIndex={0}
			onClick={onClick}
			onKeyDown={() => {}}
		>
			{children}
		</div>
	),
	ContextMenuSeparator: () => <div data-testid="context-menu-separator" />,
	ContextMenuShortcut: ({ children }: { children: React.ReactNode }) => (
		<span>{children}</span>
	),
}));

// Mock Radix UI Dialog
vi.mock("@/components/ui/dialog", () => ({
	Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
		open ? <div data-testid="dialog">{children}</div> : null,
	DialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-content">{children}</div>
	),
	DialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-header">{children}</div>
	),
	DialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-footer">{children}</div>
	),
	DialogTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-title">{children}</div>
	),
	DialogDescription: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-description">{children}</div>
	),
}));

describe("FileTreePane", () => {
	it("renders file tree with context menu triggers", () => {
		render(<FileTreePane />);

		// Check if file items are rendered
		expect(screen.getByText("index.ts")).toBeInTheDocument();
		expect(screen.getByText("Button.tsx")).toBeInTheDocument();

		// Check if context menu triggers are present
		const triggers = screen.getAllByTestId("context-menu-trigger");
		expect(triggers.length).toBeGreaterThan(0);
	});
});
