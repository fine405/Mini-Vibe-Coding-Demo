import { useCallback, useState } from "react";
import { useFs } from "@/modules/fs/store";
import { EditorDiffView } from "./EditorDiffView";
import { EditorEmptyState } from "./EditorEmptyState";
import { EditorTabs } from "./EditorTabs";
import { getLanguageFromPath, MonacoEditorWrapper } from "./MonacoEditor";
import { RevertDialog } from "./RevertDialog";
import { useEditor } from "./store";

export function EditorPane() {
	const { filesByPath, revertFile } = useFs();
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

	if (openFiles.length === 0) {
		return <EditorEmptyState />;
	}

	const language = activeFilePath
		? getLanguageFromPath(activeFilePath)
		: "plaintext";
	const showDiff =
		activeOpenFile?.viewMode === "diff" &&
		activeFile &&
		activeFile.status !== "clean";

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
				{activeFile && activeFilePath ? (
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
		</div>
	);
}
