import { useCallback, useState } from "react";
import { toast } from "sonner";
import { DiffReviewToolbar } from "@/modules/chat/DiffReviewToolbar";
import { useChatStore } from "@/modules/chat/store";
import { useFs } from "@/modules/fs/store";
import { EditorDiffView } from "./EditorDiffView";
import { EditorEmptyState } from "./EditorEmptyState";
import { EditorTabs } from "./EditorTabs";
import { getLanguageFromPath, MonacoEditorWrapper } from "./MonacoEditor";
import { RevertDialog } from "./RevertDialog";
import { useEditor } from "./store";

export function EditorPane() {
	const { filesByPath, revertFile, setFiles, acceptAllChanges } = useFs();
	const updateFileContent = useFs((s) => s.updateFileContent);
	const [revertDialogOpen, setRevertDialogOpen] = useState(false);
	const [fileToRevert, setFileToRevert] = useState<string | null>(null);

	const {
		openFiles,
		activeFilePath,
		closeFile,
		setActiveFile,
		toggleViewMode,
	} = useEditor();

	const {
		reviewState,
		pendingChange,
		endReview,
		navigateToFile,
		selectAllHunksInFile,
		deselectAllHunksInFile,
		updateMessagePatchStatus,
		setPendingChange,
	} = useChatStore();

	const { isReviewing, currentFileIndex, totalFiles } = reviewState;

	const activeFile = activeFilePath ? filesByPath[activeFilePath] : null;
	const activeOpenFile = openFiles.find((f) => f.path === activeFilePath);

	const handleContentChange = useCallback(
		(newContent: string) => {
			if (activeFilePath) {
				updateFileContent(activeFilePath, newContent);
			}
		},
		[activeFilePath, updateFileContent],
	);

	const getFileStatus = useCallback(
		(path: string) => {
			return filesByPath[path]?.status || "clean";
		},
		[filesByPath],
	);

	const getOriginalContent = useCallback(
		(path: string) => {
			const file = filesByPath[path];
			return file?.originalContent ?? file?.content ?? "";
		},
		[filesByPath],
	);

	const handleRevert = useCallback((path: string) => {
		setFileToRevert(path);
		setRevertDialogOpen(true);
	}, []);

	const confirmRevert = useCallback(() => {
		if (fileToRevert) {
			revertFile(fileToRevert);
		}
		setRevertDialogOpen(false);
		setFileToRevert(null);
	}, [fileToRevert, revertFile]);

	const canRevert = useCallback(
		(path: string) => {
			const file = filesByPath[path];
			return file?.status === "modified" && file?.originalContent !== undefined;
		},
		[filesByPath],
	);

	// Handle completing the review - apply changes and update chat status
	const handleCompleteReview = useCallback(
		(status: "applied" | "rejected") => {
			if (pendingChange) {
				// Apply selected file changes
				if (status === "applied") {
					// Accept any pending changes first
					acceptAllChanges();

					// Get fresh filesByPath
					const currentFiles = useFs.getState().filesByPath;
					const newFilesByPath = { ...currentFiles };
					const originalContents: Record<string, string> = {};
					let appliedCount = 0;

					// Apply each selected file
					for (let i = 0; i < pendingChange.patch.changes.length; i++) {
						const isSelected = pendingChange.fileSelections.get(i) ?? true;
						if (!isSelected) continue;

						const change = pendingChange.patch.changes[i];
						const newContent = change.content || "";

						// Save original content for revert
						originalContents[change.path] =
							currentFiles[change.path]?.content || "";

						if (change.op === "delete") {
							delete newFilesByPath[change.path];
						} else {
							// Set as "clean" with no originalContent so it can't be reverted from editor
							newFilesByPath[change.path] = {
								path: change.path,
								content: newContent,
								status: "clean",
							};
						}
						appliedCount++;
					}

					setFiles(newFilesByPath);
					toast.success(`Applied ${appliedCount} file(s)`);

					// Save original contents to message for revert
					updateMessagePatchStatus(
						pendingChange.messageId,
						status,
						originalContents,
					);
				} else {
					updateMessagePatchStatus(pendingChange.messageId, status);
				}

				setPendingChange(null);
			}

			// Switch back to editor view for active file
			if (activeFilePath) {
				useEditor.getState().setViewMode(activeFilePath, "editor");
			}

			endReview();
		},
		[
			pendingChange,
			updateMessagePatchStatus,
			setPendingChange,
			endReview,
			acceptAllChanges,
			setFiles,
			activeFilePath,
		],
	);

	if (openFiles.length === 0) {
		return <EditorEmptyState />;
	}

	const language = activeFilePath
		? getLanguageFromPath(activeFilePath)
		: "plaintext";

	// Check if we're reviewing a pending patch for this file
	const currentPatchChange =
		isReviewing && pendingChange
			? pendingChange.patch.changes[currentFileIndex]
			: null;
	const isReviewingCurrentFile = currentPatchChange?.path === activeFilePath;

	// Show diff if: normal diff mode with modified file, OR reviewing a pending patch
	const showDiff =
		(activeOpenFile?.viewMode === "diff" &&
			activeFile &&
			activeFile.status !== "clean") ||
		isReviewingCurrentFile;

	return (
		<div className="h-full w-full flex flex-col bg-bg-primary text-fg-primary">
			{/* Tabs */}
			<EditorTabs
				openFiles={openFiles}
				activeFilePath={activeFilePath}
				onSelectTab={setActiveFile}
				onCloseTab={closeFile}
				onToggleViewMode={toggleViewMode}
				getFileStatus={getFileStatus}
				onRevert={handleRevert}
				canRevert={canRevert}
			/>

			{/* Editor content */}
			<div className="flex-1 overflow-hidden">
				{isReviewingCurrentFile && currentPatchChange ? (
					// Show diff for pending patch (even if file doesn't exist yet)
					<EditorDiffView
						originalContent={activeFile?.content || ""}
						modifiedContent={currentPatchChange.content || ""}
						language={language}
					/>
				) : activeFile && activeFilePath ? (
					showDiff ? (
						<EditorDiffView
							originalContent={getOriginalContent(activeFilePath)}
							modifiedContent={activeFile.content}
							language={language}
						/>
					) : (
						<MonacoEditorWrapper
							value={activeFile.content}
							language={language}
							onChange={handleContentChange}
						/>
					)
				) : (
					<div className="h-full flex items-center justify-center text-fg-muted text-sm">
						File not found
					</div>
				)}
			</div>

			<RevertDialog
				open={revertDialogOpen}
				onOpenChange={setRevertDialogOpen}
				filePath={fileToRevert}
				onConfirm={confirmRevert}
			/>

			{/* Diff Review Toolbar - shown when reviewing changes */}
			{isReviewing && pendingChange && (
				<DiffReviewToolbar
					totalFiles={totalFiles}
					onAcceptFile={() => {
						const hunks = pendingChange.hunkSelections.get(currentFileIndex);
						selectAllHunksInFile(currentFileIndex, hunks?.size || 1);
						if (currentFileIndex < totalFiles - 1) {
							const nextPath =
								pendingChange.patch.changes[currentFileIndex + 1]?.path;
							if (nextPath) {
								navigateToFile(currentFileIndex + 1);
								useEditor.getState().openFile(nextPath);
								useEditor.getState().setViewMode(nextPath, "diff");
							}
						} else {
							// Last file accepted - mark as applied
							handleCompleteReview("applied");
						}
					}}
					onRejectFile={() => {
						deselectAllHunksInFile(currentFileIndex);
						if (currentFileIndex < totalFiles - 1) {
							const nextPath =
								pendingChange.patch.changes[currentFileIndex + 1]?.path;
							if (nextPath) {
								navigateToFile(currentFileIndex + 1);
								useEditor.getState().openFile(nextPath);
								useEditor.getState().setViewMode(nextPath, "diff");
							}
						} else {
							// Last file rejected - check if any OTHER files were accepted
							// (current file is being rejected, so exclude it from check)
							const hasAccepted = Array.from(
								pendingChange.fileSelections.entries(),
							).some(([idx, v]) => idx !== currentFileIndex && v);
							handleCompleteReview(hasAccepted ? "applied" : "rejected");
						}
					}}
					onDone={() => {
						// Done button - check if any files were accepted
						const hasAccepted = Array.from(
							pendingChange.fileSelections.values(),
						).some((v) => v);
						handleCompleteReview(hasAccepted ? "applied" : "rejected");
					}}
				/>
			)}
		</div>
	);
}
