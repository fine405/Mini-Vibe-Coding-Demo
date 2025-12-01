import {
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	X,
} from "lucide-react";
import { useCallback, useEffect } from "react";
import { useEditor } from "@/modules/editor";
import { useChatStore } from "./store";

interface DiffReviewToolbarProps {
	totalFiles: number;
	onAcceptFile: () => void;
	onRejectFile: () => void;
	onDone: () => void;
}

export function DiffReviewToolbar({
	totalFiles,
	onAcceptFile,
	onRejectFile,
	onDone,
}: DiffReviewToolbarProps) {
	const { reviewState, navigateToFile, navigateToHunk, pendingChange } =
		useChatStore();
	const { currentFileIndex, currentHunkIndex, totalHunks } = reviewState;

	const canGoPrevFile = currentFileIndex > 0;
	const canGoNextFile = currentFileIndex < totalFiles - 1;
	const canGoPrevHunk = currentHunkIndex > 0;
	const canGoNextHunk = currentHunkIndex < totalHunks - 1;

	const handlePrevFile = useCallback(() => {
		if (canGoPrevFile && pendingChange) {
			const prevIndex = currentFileIndex - 1;
			const prevPath = pendingChange.patch.changes[prevIndex]?.path;
			if (prevPath) {
				navigateToFile(prevIndex);
				useEditor.getState().openFile(prevPath);
				useEditor.getState().setViewMode(prevPath, "diff");
			}
		}
	}, [canGoPrevFile, currentFileIndex, navigateToFile, pendingChange]);

	const handleNextFile = useCallback(() => {
		if (canGoNextFile && pendingChange) {
			const nextIndex = currentFileIndex + 1;
			const nextPath = pendingChange.patch.changes[nextIndex]?.path;
			if (nextPath) {
				navigateToFile(nextIndex);
				useEditor.getState().openFile(nextPath);
				useEditor.getState().setViewMode(nextPath, "diff");
			}
		}
	}, [canGoNextFile, currentFileIndex, navigateToFile, pendingChange]);

	const handlePrevHunk = useCallback(() => {
		if (canGoPrevHunk) {
			navigateToHunk(currentHunkIndex - 1);
		}
	}, [canGoPrevHunk, currentHunkIndex, navigateToHunk]);

	const handleNextHunk = useCallback(() => {
		if (canGoNextHunk) {
			navigateToHunk(currentHunkIndex + 1);
		}
	}, [canGoNextHunk, currentHunkIndex, navigateToHunk]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// ⌘↩ - Accept file
			if (e.metaKey && e.key === "Enter" && !e.shiftKey && !e.altKey) {
				e.preventDefault();
				onAcceptFile();
				return;
			}

			// ⌥⌘⌫ - Reject file
			if (
				e.metaKey &&
				e.altKey &&
				(e.key === "Backspace" || e.key === "Delete")
			) {
				e.preventDefault();
				onRejectFile();
				return;
			}

			// Arrow keys for navigation (when not in input)
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			if (e.key === "ArrowLeft" && e.metaKey) {
				e.preventDefault();
				handlePrevFile();
			} else if (e.key === "ArrowRight" && e.metaKey) {
				e.preventDefault();
				handleNextFile();
			} else if (e.key === "ArrowUp" && e.altKey) {
				e.preventDefault();
				handlePrevHunk();
			} else if (e.key === "ArrowDown" && e.altKey) {
				e.preventDefault();
				handleNextHunk();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		onAcceptFile,
		onRejectFile,
		handlePrevFile,
		handleNextFile,
		handlePrevHunk,
		handleNextHunk,
	]);

	return (
		<div className="shrink-0 bg-bg-secondary border-t border-border-primary px-2 sm:px-4 py-2 flex items-center justify-between gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
			{/* Left: Hunk navigation - hidden on very small screens */}
			<div className="hidden sm:flex items-center gap-1 sm:gap-2">
				<button
					type="button"
					onClick={handlePrevHunk}
					disabled={!canGoPrevHunk}
					className="p-1 hover:bg-bg-tertiary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					title="Previous edit (⌥↑)"
				>
					<ChevronUp className="h-4 w-4 text-fg-muted" />
				</button>
				<span className="text-xs text-fg-muted min-w-12 text-center hidden md:inline">
					{totalHunks > 0 ? `${currentHunkIndex + 1} edit` : "0 edits"}
				</span>
				<button
					type="button"
					onClick={handleNextHunk}
					disabled={!canGoNextHunk}
					className="p-1 hover:bg-bg-tertiary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					title="Next edit (⌥↓)"
				>
					<ChevronDown className="h-4 w-4 text-fg-muted" />
				</button>
			</div>

			{/* Center: File actions */}
			<div className="flex items-center gap-1 sm:gap-2">
				<button
					type="button"
					onClick={onAcceptFile}
					className="px-2 sm:px-3 py-1.5 text-xs font-medium text-white bg-success hover:bg-success/90 rounded transition-colors flex items-center gap-1 sm:gap-1.5"
					title="Accept File (⌘↩)"
				>
					<Check className="h-3.5 w-3.5" />
					<span className="hidden xs:inline">Accept</span>
					<span className="hidden sm:inline"> File</span>
					<kbd className="hidden md:inline ml-1 px-1 py-0.5 text-[10px] bg-white/20 rounded">
						⌘↩
					</kbd>
				</button>
				<button
					type="button"
					onClick={onRejectFile}
					className="px-2 sm:px-3 py-1.5 text-xs font-medium text-fg-secondary hover:text-fg-primary bg-bg-tertiary hover:bg-bg-secondary border border-border-primary rounded transition-colors flex items-center gap-1 sm:gap-1.5"
					title="Reject File (⌥⌘⌫)"
				>
					<X className="h-3.5 w-3.5" />
					<span className="hidden xs:inline">Reject</span>
					<span className="hidden sm:inline"> File</span>
					<kbd className="hidden md:inline ml-1 px-1 py-0.5 text-[10px] bg-bg-secondary rounded">
						⌥⌘⌫
					</kbd>
				</button>
			</div>

			{/* Right: File navigation */}
			<div className="flex items-center gap-1 sm:gap-2">
				<button
					type="button"
					onClick={handlePrevFile}
					disabled={!canGoPrevFile}
					className="p-1 hover:bg-bg-tertiary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					title="Previous file (⌘←)"
				>
					<ChevronLeft className="h-4 w-4 text-fg-muted" />
				</button>
				<span className="text-xs text-fg-muted text-center whitespace-nowrap">
					<span className="hidden sm:inline">{currentFileIndex + 1} of </span>
					<span className="sm:hidden">{currentFileIndex + 1}/</span>
					{totalFiles}
					<span className="hidden sm:inline"> files</span>
				</span>
				<button
					type="button"
					onClick={handleNextFile}
					disabled={!canGoNextFile}
					className="p-1 hover:bg-bg-tertiary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					title="Next file (⌘→)"
				>
					<ChevronRight className="h-4 w-4 text-fg-muted" />
				</button>

				{/* Done button */}
				<div className="ml-1 sm:ml-4 border-l border-border-primary pl-1 sm:pl-4">
					<button
						type="button"
						onClick={onDone}
						className="px-2 sm:px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded transition-colors"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
}

/** Inline hunk action buttons that float at the end of a hunk */
interface InlineHunkActionsProps {
	onAccept: () => void;
	onReject: () => void;
}

export function InlineHunkActions({
	onAccept,
	onReject,
}: InlineHunkActionsProps) {
	// Keyboard shortcuts for hunk actions
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// ⌥⇧↩ - Accept hunk
			if (e.altKey && e.shiftKey && e.key === "Enter") {
				e.preventDefault();
				onAccept();
				return;
			}

			// ⌥⇧⌫ - Reject hunk
			if (
				e.altKey &&
				e.shiftKey &&
				(e.key === "Backspace" || e.key === "Delete")
			) {
				e.preventDefault();
				onReject();
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onAccept, onReject]);

	return (
		<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-bg-secondary/90 backdrop-blur-sm border border-border-primary rounded-md p-1 shadow-lg">
			<button
				type="button"
				onClick={onAccept}
				className="px-2 py-1 text-[10px] font-medium text-white bg-success hover:bg-success/90 rounded transition-colors flex items-center gap-1"
				title="Accept (⌥⇧↩)"
			>
				Accept
				<kbd className="px-0.5 text-[9px] bg-white/20 rounded">⌥⇧↩</kbd>
			</button>
			<button
				type="button"
				onClick={onReject}
				className="px-2 py-1 text-[10px] font-medium text-fg-secondary hover:text-fg-primary bg-bg-tertiary hover:bg-bg-secondary rounded transition-colors flex items-center gap-1"
				title="Reject (⌥⇧⌫)"
			>
				Reject
				<kbd className="px-0.5 text-[9px] bg-bg-secondary rounded">⌥⇧⌫</kbd>
			</button>
		</div>
	);
}
