import { useCallback, useState } from "react";
import { EditorDiffView } from "@/modules/editor/EditorDiffView";
import { EditorEmptyState } from "@/modules/editor/EditorEmptyState";
import { EditorTabs } from "@/modules/editor/EditorTabs";
import { getLanguageFromPath } from "@/modules/editor/language";
import { MonacoEditorWrapper } from "@/modules/editor/MonacoEditor";
import { RevertDialog } from "@/modules/editor/RevertDialog";
import { useEditor } from "@/modules/editor/store";
import {
	browserWorkspace,
	useBrowserWorkspaceFiles,
} from "@/modules/workspace/browser";

export function EditorPane() {
	const filesByPath = useBrowserWorkspaceFiles();
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
	const activeOpenFile = openFiles.find((file) => file.path === activeFilePath);

	const handleContentChange = useCallback(
		(content: string) => {
			if (activeFilePath) {
				void browserWorkspace.updateFileContent(activeFilePath, content);
			}
		},
		[activeFilePath],
	);
	const getFileStatus = useCallback(
		(path: string) => filesByPath[path]?.status ?? "clean",
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
		if (!fileToRevert) return;
		void browserWorkspace.revertFile(fileToRevert).then(() => {
			setRevertDialogOpen(false);
			setFileToRevert(null);
		});
	}, [fileToRevert]);
	const canRevert = useCallback(
		(path: string) => {
			const file = filesByPath[path];
			return file?.status === "modified" && file.originalContent !== undefined;
		},
		[filesByPath],
	);

	if (openFiles.length === 0) return <EditorEmptyState />;

	const language = activeFilePath
		? getLanguageFromPath(activeFilePath)
		: "plaintext";
	const showDiff = Boolean(
		activeOpenFile?.viewMode === "diff" &&
			activeFile &&
			activeFile.status !== "clean",
	);

	return (
		<div
			id="tour-editor"
			className="flex h-full w-full flex-col bg-bg-primary text-fg-primary"
		>
			<EditorTabs
				activeFilePath={activeFilePath}
				canRevert={canRevert}
				getFileStatus={getFileStatus}
				onCloseTab={closeFile}
				onRevert={handleRevert}
				onSelectTab={setActiveFile}
				onToggleViewMode={toggleViewMode}
				openFiles={openFiles}
			/>
			<div className="flex-1 overflow-hidden">
				{activeFile && activeFilePath ? (
					showDiff ? (
						<EditorDiffView
							language={language}
							modifiedContent={activeFile.content}
							originalContent={getOriginalContent(activeFilePath)}
						/>
					) : (
						<MonacoEditorWrapper
							language={language}
							onChange={handleContentChange}
							value={activeFile.content}
						/>
					)
				) : (
					<div className="flex h-full items-center justify-center text-sm text-fg-muted">
						File not found
					</div>
				)}
			</div>
			<RevertDialog
				filePath={fileToRevert}
				onConfirm={confirmRevert}
				onOpenChange={setRevertDialogOpen}
				open={revertDialogOpen}
			/>
		</div>
	);
}
