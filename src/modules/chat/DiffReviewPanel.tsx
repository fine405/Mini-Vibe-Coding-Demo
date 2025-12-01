import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DiffViewer } from "@/components/DiffViewer";
import { useFs } from "@/modules/fs/store";
import { type ParsedHunks, parseHunksAsync } from "@/modules/patches/hunk";
import { DiffReviewToolbar, InlineHunkActions } from "./DiffReviewToolbar";
import { useChatStore } from "./store";

export function DiffReviewPanel() {
	const { filesByPath } = useFs();
	const {
		pendingChange,
		reviewState,
		endReview,
		navigateToFile,
		updateHunkSelection,
		selectAllHunksInFile,
		deselectAllHunksInFile,
	} = useChatStore();

	const [parsedHunks, setParsedHunks] = useState<ParsedHunks | null>(null);

	const { isReviewing, currentFileIndex, currentHunkIndex, totalFiles } =
		reviewState;

	const currentChange = pendingChange?.patch.changes[currentFileIndex];

	// Parse hunks for current file
	useEffect(() => {
		if (!currentChange || !isReviewing) {
			setParsedHunks(null);
			return;
		}

		let cancelled = false;

		async function parse() {
			if (!currentChange) return;
			const oldContent = filesByPath[currentChange.path]?.content || "";
			const newContent = currentChange.content || "";
			const parsed = await parseHunksAsync(
				oldContent,
				newContent,
				currentChange.path,
				currentChange.op,
			);
			if (!cancelled) {
				setParsedHunks(parsed);
			}
		}

		parse();

		return () => {
			cancelled = true;
		};
	}, [currentChange, isReviewing, filesByPath]);

	const oldContent = useMemo(() => {
		if (!currentChange) return "";
		return filesByPath[currentChange.path]?.content || "";
	}, [currentChange, filesByPath]);

	const newContent = useMemo(() => {
		if (!currentChange) return "";
		return currentChange.content || "";
	}, [currentChange]);

	const handleAcceptFile = () => {
		if (parsedHunks) {
			selectAllHunksInFile(currentFileIndex, parsedHunks.hunks.length);
		}
		// Move to next file or close
		if (currentFileIndex < totalFiles - 1) {
			navigateToFile(currentFileIndex + 1);
		} else {
			endReview();
		}
	};

	const handleRejectFile = () => {
		deselectAllHunksInFile(currentFileIndex);
		// Move to next file or close
		if (currentFileIndex < totalFiles - 1) {
			navigateToFile(currentFileIndex + 1);
		} else {
			endReview();
		}
	};

	const handleAcceptHunk = (hunkIndex: number) => {
		updateHunkSelection(currentFileIndex, hunkIndex, true);
	};

	const handleRejectHunk = (hunkIndex: number) => {
		updateHunkSelection(currentFileIndex, hunkIndex, false);
	};

	if (!isReviewing || !currentChange) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
			{/* Header */}
			<div className="shrink-0 h-10 px-4 flex items-center justify-between border-b border-border-primary bg-bg-secondary">
				<div className="flex items-center gap-3">
					<span className="text-xs font-medium text-fg-primary">
						Review Changes
					</span>
					<span className="text-xs text-fg-muted font-mono">
						{currentChange.path}
					</span>
				</div>
				<button
					type="button"
					onClick={endReview}
					className="p-1 hover:bg-bg-tertiary rounded transition-colors"
					title="Close (Esc)"
				>
					<X className="h-4 w-4 text-fg-muted" />
				</button>
			</div>

			{/* Diff Content */}
			<div className="flex-1 overflow-auto pb-14">
				<DiffViewer
					oldContent={oldContent}
					newContent={newContent}
					fileName={currentChange.path}
				/>

				{/* Hunk markers - simplified for now */}
			</div>

			{/* Floating hunk action buttons - shown at top right of content */}
			<div className="fixed top-14 right-4 z-50">
				<InlineHunkActions
					onAccept={() => handleAcceptHunk(currentHunkIndex)}
					onReject={() => handleRejectHunk(currentHunkIndex)}
				/>
			</div>

			{/* Bottom Toolbar */}
			<DiffReviewToolbar
				totalFiles={totalFiles}
				onAcceptFile={handleAcceptFile}
				onRejectFile={handleRejectFile}
				onDone={endReview}
			/>
		</div>
	);
}
