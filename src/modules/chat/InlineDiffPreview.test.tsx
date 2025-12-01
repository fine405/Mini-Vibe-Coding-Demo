import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Patch } from "@/modules/patches/types";
import { InlineDiffPreview } from "./InlineDiffPreview";

// Mock dependencies - must use inline values since vi.mock is hoisted
vi.mock("./store", () => ({
	useChatStore: () => ({
		pendingChange: null,
		updateFileSelection: vi.fn(),
		setPendingChange: vi.fn(),
	}),
}));

vi.mock("@/modules/fs/store", () => ({
	useFs: () => ({
		filesByPath: {
			"/src/App.tsx": { content: "original content", path: "/src/App.tsx" },
		},
	}),
}));

vi.mock("@/modules/patches/hunk", () => ({
	parseHunksAsync: vi.fn().mockResolvedValue({
		hunks: [{ index: 0, startLine: 1, endLine: 5, lines: ["+new line"] }],
		oldContent: "old",
		newContent: "new",
	}),
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
	Check: () => <div data-testid="icon-check" />,
	ChevronDown: () => <div data-testid="icon-chevron-down" />,
	ChevronRight: () => <div data-testid="icon-chevron-right" />,
	Eye: () => <div data-testid="icon-eye" />,
	FileCode2: () => <div data-testid="icon-file" />,
	FileEdit: () => <div data-testid="icon-file-edit" />,
	FilePlus: () => <div data-testid="icon-file-plus" />,
	FileX: () => <div data-testid="icon-file-x" />,
	Loader2: () => <div data-testid="icon-loader" />,
	X: () => <div data-testid="icon-x" />,
}));

const mockPatch: Patch = {
	id: "test-patch",
	summary: "Test patch",
	trigger: "test",
	changes: [
		{ path: "/src/App.tsx", op: "update", content: "new content" },
		{ path: "/src/NewFile.tsx", op: "create", content: "created content" },
	],
};

describe("InlineDiffPreview", () => {
	const mockOnAccept = vi.fn();
	const mockOnReject = vi.fn();
	const mockOnViewDiff = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render file list from patch after parsing", async () => {
		render(
			<InlineDiffPreview
				patch={mockPatch}
				messageId="msg-1"
				onAccept={mockOnAccept}
				onReject={mockOnReject}
				onViewDiff={mockOnViewDiff}
			/>,
		);

		// Wait for parsing to complete
		await waitFor(
			() => {
				expect(screen.queryByTestId("icon-loader")).not.toBeInTheDocument();
			},
			{ timeout: 2000 },
		);

		// Check file names are rendered
		expect(screen.getByText("App.tsx")).toBeInTheDocument();
		expect(screen.getByText("NewFile.tsx")).toBeInTheDocument();
	});

	it("should show loading state while parsing", () => {
		render(
			<InlineDiffPreview
				patch={mockPatch}
				messageId="msg-1"
				onAccept={mockOnAccept}
				onReject={mockOnReject}
				onViewDiff={mockOnViewDiff}
			/>,
		);

		// Initially should show loading
		expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
	});
});
