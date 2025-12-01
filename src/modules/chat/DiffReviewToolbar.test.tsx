import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiffReviewToolbar } from "./DiffReviewToolbar";

// Mock store
const mockNavigateToFile = vi.fn();
const mockNavigateToHunk = vi.fn();

vi.mock("./store", () => ({
	useChatStore: () => ({
		reviewState: {
			isReviewing: true,
			currentFileIndex: 1,
			currentHunkIndex: 2,
			totalFiles: 3,
			totalHunks: 5,
		},
		navigateToFile: mockNavigateToFile,
		navigateToHunk: mockNavigateToHunk,
		pendingChange: {
			messageId: "msg-1",
			patch: {
				id: "p1",
				summary: "Test",
				trigger: "test",
				changes: [
					{ path: "/file1.ts", op: "update", content: "c1" },
					{ path: "/file2.ts", op: "update", content: "c2" },
					{ path: "/file3.ts", op: "update", content: "c3" },
				],
			},
			fileSelections: new Map(),
			hunkSelections: new Map(),
			status: "reviewing",
		},
	}),
}));

vi.mock("@/modules/editor", () => ({
	useEditor: {
		getState: () => ({
			openFile: vi.fn(),
			setViewMode: vi.fn(),
		}),
	},
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
	Check: () => <div data-testid="icon-check" />,
	ChevronDown: () => <div data-testid="icon-chevron-down" />,
	ChevronLeft: () => <div data-testid="icon-chevron-left" />,
	ChevronRight: () => <div data-testid="icon-chevron-right" />,
	ChevronUp: () => <div data-testid="icon-chevron-up" />,
	X: () => <div data-testid="icon-x" />,
}));

describe("DiffReviewToolbar", () => {
	const mockOnAcceptFile = vi.fn();
	const mockOnRejectFile = vi.fn();
	const mockOnDone = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render file and hunk navigation indicators", () => {
		render(
			<DiffReviewToolbar
				totalFiles={3}
				onAcceptFile={mockOnAcceptFile}
				onRejectFile={mockOnRejectFile}
				onDone={mockOnDone}
			/>,
		);

		// File indicator contains "2 of" and "3" (split across spans)
		expect(screen.getByText(/2 of/)).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();

		// Hunk indicator: "3 edit" (1-indexed display, currentHunkIndex=2 -> 3)
		expect(screen.getByText(/3 edit/)).toBeInTheDocument();
	});

	it("should render Accept and Reject buttons", () => {
		render(
			<DiffReviewToolbar
				totalFiles={3}
				onAcceptFile={mockOnAcceptFile}
				onRejectFile={mockOnRejectFile}
				onDone={mockOnDone}
			/>,
		);

		expect(screen.getByText("Accept")).toBeInTheDocument();
		expect(screen.getByText("Reject")).toBeInTheDocument();
	});

	describe("keyboard shortcuts", () => {
		it("should call onAcceptFile on ⌘↩", () => {
			render(
				<DiffReviewToolbar
					totalFiles={3}
					onAcceptFile={mockOnAcceptFile}
					onRejectFile={mockOnRejectFile}
					onDone={mockOnDone}
				/>,
			);

			fireEvent.keyDown(document, {
				key: "Enter",
				metaKey: true,
				shiftKey: false,
				altKey: false,
			});

			expect(mockOnAcceptFile).toHaveBeenCalledTimes(1);
		});

		it("should call onRejectFile on ⌥⌘⌫", () => {
			render(
				<DiffReviewToolbar
					totalFiles={3}
					onAcceptFile={mockOnAcceptFile}
					onRejectFile={mockOnRejectFile}
					onDone={mockOnDone}
				/>,
			);

			fireEvent.keyDown(document, {
				key: "Backspace",
				metaKey: true,
				altKey: true,
			});

			expect(mockOnRejectFile).toHaveBeenCalledTimes(1);
		});

		it("should navigate to previous hunk on ⌥↑", () => {
			render(
				<DiffReviewToolbar
					totalFiles={3}
					onAcceptFile={mockOnAcceptFile}
					onRejectFile={mockOnRejectFile}
					onDone={mockOnDone}
				/>,
			);

			fireEvent.keyDown(window, {
				key: "ArrowUp",
				altKey: true,
			});

			expect(mockNavigateToHunk).toHaveBeenCalledWith(1); // currentHunkIndex - 1 = 2 - 1 = 1
		});

		it("should navigate to next hunk on ⌥↓", () => {
			render(
				<DiffReviewToolbar
					totalFiles={3}
					onAcceptFile={mockOnAcceptFile}
					onRejectFile={mockOnRejectFile}
					onDone={mockOnDone}
				/>,
			);

			fireEvent.keyDown(window, {
				key: "ArrowDown",
				altKey: true,
			});

			expect(mockNavigateToHunk).toHaveBeenCalledWith(3); // currentHunkIndex + 1 = 2 + 1 = 3
		});

		it("should navigate to previous file on ⌘←", () => {
			render(
				<DiffReviewToolbar
					totalFiles={3}
					onAcceptFile={mockOnAcceptFile}
					onRejectFile={mockOnRejectFile}
					onDone={mockOnDone}
				/>,
			);

			fireEvent.keyDown(window, {
				key: "ArrowLeft",
				metaKey: true,
			});

			expect(mockNavigateToFile).toHaveBeenCalledWith(0); // currentFileIndex - 1 = 1 - 1 = 0
		});

		it("should navigate to next file on ⌘→", () => {
			render(
				<DiffReviewToolbar
					totalFiles={3}
					onAcceptFile={mockOnAcceptFile}
					onRejectFile={mockOnRejectFile}
					onDone={mockOnDone}
				/>,
			);

			fireEvent.keyDown(window, {
				key: "ArrowRight",
				metaKey: true,
			});

			expect(mockNavigateToFile).toHaveBeenCalledWith(2); // currentFileIndex + 1 = 1 + 1 = 2
		});
	});
});
